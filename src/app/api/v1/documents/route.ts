import { NextResponse } from "next/server";
import { z } from "zod";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";
import { r2Config, createR2Client, R2_BUCKET } from "@/lib/r2";

/**
 * GET /api/v1/documents?key=documents/2026/09/a1b2c3d4.pdf — opens one scanned
 * licence (0061).
 *
 * Why this exists rather than a link to the public URL: the bucket is
 * public-read, because it was built for logos that belong on the public site
 * (docs/image-uploads-r2.md). A trade licence is not a logo — it carries the
 * owner's details and signature. So nothing in the app ever renders the public
 * address of a document; this route checks who is asking, then redirects to a
 * presigned GET that stops working after a minute.
 *
 * The presigned URL is signed with our credentials, so it will keep working
 * unchanged if the bucket is later made private — which is the right end
 * state and a bucket setting, not a code change. Until then the object is
 * still fetchable by anyone who learns its key; the key is 16 random hex
 * characters and is never published.
 *
 * Two kinds of document live behind this route, and they are authorised
 * differently because the tables behind them are:
 *
 *   - A hospital's licence scans (0061), which hang off columns on
 *     `public.tenants`. That table's read policy is hospital-WIDE — proved it:
 *     a doctor at the hospital can select the row, scan column and all — so
 *     RLS alone would hand a trade licence to every doctor and receptionist on
 *     staff. The role check below is what stops that; RLS then decides which
 *     hospital, the half it is genuinely good at.
 *
 *   - The personal & confidential files shelf (0062), which carries its own
 *     RESTRICTIVE role gate: only hospital_admin and hr_admin see a row at
 *     all. There the visibility of the row IS the answer, and asking the
 *     database is better than repeating the list here, where it could drift.
 *
 *   - A patient's identity papers (0068), where the same trick works: the row
 *     is visible to the person it belongs to and to a super admin reviewing
 *     it, and to nobody else — not even the hospital treating them.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

/** The five columns a licence scan can live in (0061). */
const DOCUMENT_COLUMNS = [
  "tin_doc",
  "bin_doc",
  "trade_license_doc",
  "operating_license_doc",
  "other_licenses_doc",
] as const;

/**
 * Only keys this app writes. The folder is fixed, and the shape is the one
 * mediaKey() produces — so a caller cannot ask for someone's logo, an object
 * outside the bucket's document folder, or walk out of it with "..".
 */
const keySchema = z
  .string()
  .trim()
  .regex(
    /^(documents|identity)\/\d{4}\/\d{2}\/[a-f0-9]{16}\.(pdf|png|jpg|webp|avif|svg)$/,
    "That is not a document key",
  );

export const GET = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);

  const parsed = keySchema.safeParse(new URL(request.url).searchParams.get("key") ?? "");
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Which document?", 422);
  const key = parsed.data;

  const config = r2Config();
  if (!config) return fail("Uploads are not configured on this environment yet.", 503);

  const supabase = await createServerSupabase();

  // A patient's identity paper. RLS shows the row to its owner and to a super
  // admin; anyone else sees nothing and gets the 404 below.
  const { data: identity, error: identityError } = await supabase
    .from("identity_documents")
    .select("id")
    .eq("file_key", key)
    .limit(1)
    .maybeSingle();
  if (identityError) return fail(identityError.message, 500);

  // A file on the confidential shelf. The role gate on the table means an
  // unauthorised caller simply sees no row, and gets the same 404 as a key
  // that was never stored.
  const { data: file, error: fileError } = identity
    ? { data: null, error: null }
    : await supabase
        .from("personal_files")
        .select("id")
        .eq("file_key", key)
        .limit(1)
        .maybeSingle();
  if (fileError) return fail(fileError.message, 500);

  if (!identity && !file) {
    // Otherwise a licence scan, and `tenants` cannot answer who on its own.
    if (auth.role !== "super_admin" && auth.role !== "hospital_admin") {
      return fail("Not allowed to open this document", 403);
    }

    const { data: hospital, error } = await supabase
      .from("tenants")
      .select("id")
      .or(DOCUMENT_COLUMNS.map(column => `${column}.eq."${key}"`).join(","))
      .limit(1)
      .maybeSingle();

    if (error) return fail(error.message, 500);
    if (!hospital) return fail("Document not found", 404);
  }

  const client = createR2Client(config);
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
    { expiresIn: 60 },
  );

  // 307 rather than 302: the browser must not turn this into a GET of its own
  // invention, and the redirect must never be cached — a link that outlives
  // its minute is the one thing this route exists to prevent.
  return NextResponse.redirect(url, {
    status: 307,
    headers: { "Cache-Control": "no-store" },
  });
};
