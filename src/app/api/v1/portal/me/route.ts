import { NextResponse } from "next/server";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";

/**
 * GET /api/v1/portal/me
 *
 * Which doctor the caller is. Every other portal route resolves this for
 * itself — `doctors.profile_id = auth.uid()`, the same two lines in five
 * files — but the browser has never had the answer, and /portal/community
 * needs it: to draw the composer's avatar, to know which reaction in a post's
 * list is yours, and to know which posts you may edit.
 *
 * It is deliberately not "the profile": a doctor's name, specialty and photo
 * live on `doctors`, and that is what the portal shows.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

export const GET = async () => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("doctors")
    .select("id, tenant_id, name, specialty, photo_url")
    .eq("profile_id", auth.userId)
    .maybeSingle();

  if (error) return fail(error.message, 400);

  // Not an error: a hospital admin opening a portal page is signed in and is
  // simply not a doctor. The caller decides what that means for them.
  return json({ data });
};
