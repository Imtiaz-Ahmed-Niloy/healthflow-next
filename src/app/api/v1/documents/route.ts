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
 * Who may read one: super_admin, and a hospital_admin for their own hospital.
 * That takes two checks, and RLS is only one of them. The read policy on
 * `public.tenants` is hospital-WIDE — proved it: a doctor at the hospital can
 * select the row, scan column and all — so leaning on RLS alone would hand a
 * hospital's trade licence to every doctor, nurse and receptionist on staff.
 * The role gate below decides who; RLS then decides which hospital, which is
 * the half it is genuinely good at.
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
    /^documents\/\d{4}\/\d{2}\/[a-f0-9]{16}\.pdf$/,
    "That is not a document key",
  );

export const GET = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);

  // Owner paperwork, not staff-facing material: only the people who administer
  // the hospital record itself.
  if (auth.role !== "super_admin" && auth.role !== "hospital_admin") {
    return fail("Not allowed to open this document", 403);
  }

  const parsed = keySchema.safeParse(new URL(request.url).searchParams.get("key") ?? "");
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Which document?", 422);
  const key = parsed.data;

  const config = r2Config();
  if (!config) return fail("Uploads are not configured on this environment yet.", 503);

  // Which hospital's is it? A super_admin sees every row, a hospital_admin
  // only their own — so a hospital admin asking for another hospital's scan
  // gets the same 404 as a key that was never stored.
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("tenants")
    .select("id")
    .or(DOCUMENT_COLUMNS.map(column => `${column}.eq."${key}"`).join(","))
    .limit(1)
    .maybeSingle();

  if (error) return fail(error.message, 500);
  if (!data) return fail("Document not found", 404);

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
