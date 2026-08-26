import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPublicSupabase } from "@/lib/supabase/server";
import { contactMessageCreateSchema } from "@/server/resources/contactMessages";

/**
 * POST /api/v1/contact
 *
 * The only write endpoint in the app that an anonymous caller may use.
 *
 * Outside createResourceRoute on purpose: that factory calls requireAuth() on
 * every verb and 401s a caller with no session, which is every visitor filling
 * in /contact. Reading the inbox back does go through the factory — see
 * /api/v1/contact-messages.
 *
 * Uses the public (publishable-key) client, NOT the admin client. Anonymous
 * writes are allowed here because a policy says so — contact_messages_public_insert
 * in 0031 — not because we bypassed the policies. If this insert is ever denied,
 * the policy is what to look at.
 *
 * The response deliberately carries no row back. anon has no select policy on
 * this table (by design: it stops the inbox being world-readable), so asking
 * PostgREST to return the inserted row would fail on a write that actually
 * succeeded.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number, details?: unknown) =>
  json({ error: { message, ...(details ? { details } : {}) } }, status);

/**
 * `status` is stripped rather than validated: the column defaults to 'new' and
 * the insert policy requires it, so there is nothing a caller could usefully
 * send. Accepting it would only let someone file straight into 'archived'.
 */
const submissionSchema = contactMessageCreateSchema.omit({ status: true });

export const POST = async (request: Request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Body must be valid JSON", 400);
  }

  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten());

  /**
   * contact_messages is not in the generated Database types until the
   * migration is applied and types.ts is regenerated on merge, and the typed
   * client would reject the table name. Same reasoning — and same cast — as
   * createResourceRoute: correctness here comes from the Zod schema above and
   * from the check constraints in the migration, not from the generic.
   */
  const supabase = createPublicSupabase() as unknown as SupabaseClient;

  const { error } = await supabase.from("contact_messages").insert(parsed.data);

  if (error) {
    // 42501 = insufficient_privilege, i.e. the insert policy said no.
    if (error.code === "42501") return fail("Not allowed", 403);
    // 23514 = check_violation, i.e. a length or format constraint.
    if (error.code === "23514") return fail("Invalid values", 422);
    return fail("Could not send your message", 502);
  }

  return json({ data: { received: true } }, 201);
};
