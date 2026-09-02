import { NextResponse } from "next/server";
import { z } from "zod";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getAuthContext, type AppRole } from "@/lib/supabase/server";
import { r2Config, createR2Client, R2_BUCKET } from "@/lib/r2";
import {
  mediaKey,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  ALLOWED_DOCUMENT_TYPES,
  MAX_DOCUMENT_BYTES,
  type MediaFolder,
} from "@/lib/media";

/**
 * POST /api/v1/uploads — asks for permission to upload one file: an image,
 * or a scanned licence PDF into the documents folder (0061).
 *
 * The file itself never touches this server. The browser sends what it wants
 * to upload, this decides whether that is allowed, and hands back a presigned
 * PUT that is only good for that one object, that one content type, and five
 * minutes. The browser then PUTs straight to Cloudflare, so a big upload
 * cannot tie up a Next.js worker.
 *
 * That is also why the checks here matter: this endpoint IS the control. Once
 * a presigned URL is issued nothing else stands between the browser and the
 * bucket, so anything we care about — who, what kind, how big, under what key
 * — has to be settled before signing.
 *
 * See docs/image-uploads-r2.md.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

/**
 * Who may write into which folder.
 *
 * The key is built here from the folder, never taken from the request, so a
 * caller cannot talk their way into another folder by sending a path.
 * super_admin passes everywhere, as it does in every other gate.
 */
const FOLDER_ROLES: Record<MediaFolder, AppRole[]> = {
  hospitals: ["hospital_admin"],
  doctors: ["hospital_admin"],
  announcements: [],
  blog: [],
  avatars: ["hospital_admin", "hr_admin", "finance_admin", "doctor", "patient"],
  // A doctor posting in the community attaches their own images.
  community: ["doctor"],
  // Scanned licences on a hospital's own record (0061). A hospital admin
  // uploads their paperwork; super_admin passes here as everywhere.
  documents: ["hospital_admin"],
};

const uploadRequestSchema = z.object({
  folder: z.enum([
    "hospitals", "doctors", "announcements", "blog", "avatars", "community", "documents",
  ]),
  contentType: z.enum([...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES]),
  size: z.number().int().positive(),
});

/**
 * What each folder takes. Checked against the folder rather than globally,
 * so a PDF cannot be filed as a hospital logo and a JPEG cannot be passed off
 * as a scanned licence — and the 10MB document limit does not quietly become
 * the limit for images everywhere.
 */
const folderRules = (folder: MediaFolder) =>
  folder === "documents"
    ? { types: ALLOWED_DOCUMENT_TYPES as readonly string[], maxBytes: MAX_DOCUMENT_BYTES, noun: "document" }
    : { types: ALLOWED_IMAGE_TYPES as readonly string[], maxBytes: MAX_IMAGE_BYTES, noun: "image" };

export const POST = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);

  const config = r2Config();
  if (!config) {
    // Deliberately explicit: this is a deployment gap, not a user error, and
    // the person who hits it is the one who can fix it.
    return fail(
      "Uploads are not configured on this environment yet — R2_ACCOUNT_ID, "
        + "R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and NEXT_PUBLIC_R2_PUBLIC_URL "
        + "need setting. See docs/image-uploads-r2.md.",
      503,
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = uploadRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "That upload is not allowed", 422);
  }

  const { folder, contentType, size } = parsed.data;

  const rules = folderRules(folder);
  if (!rules.types.includes(contentType)) {
    return fail(
      folder === "documents"
        ? "Licence documents must be PDFs."
        : "That file type is not accepted here.",
      422,
    );
  }
  if (size > rules.maxBytes) {
    return fail(
      `That ${rules.noun} is ${(size / 1024 / 1024).toFixed(1)}MB — the limit is ${rules.maxBytes / 1024 / 1024}MB.`,
      422,
    );
  }

  const allowed = FOLDER_ROLES[folder];
  if (auth.role !== "super_admin" && !(auth.role && allowed.includes(auth.role))) {
    return fail("Not allowed to upload here", 403);
  }

  const key = mediaKey(folder, contentType);

  const client = createR2Client(config);
  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
      // Signed in, so the upload cannot be swapped for a different size than
      // the one that was authorised.
      ContentLength: size,
    }),
    { expiresIn: 300 },
  );

  /**
   * `key` is what the caller stores in the column. `publicUrl` is only for
   * showing the preview straight after upload — persisting it instead of the
   * key is the mistake this whole design exists to prevent.
   */
  return json({
    data: {
      key,
      uploadUrl,
      publicUrl: `${config.publicUrl.replace(/\/+$/, "")}/${key}`,
    },
  });
};
