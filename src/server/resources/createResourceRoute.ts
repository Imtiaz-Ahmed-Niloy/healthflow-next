import "server-only";

import { NextResponse } from "next/server";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase, getAuthContext, type AuthContext } from "@/lib/supabase/server";
import type { ResourceDefinition } from "./types";

/**
 * The factory addresses tables by a runtime string, so the schema-typed
 * client cannot help here — it would collapse every call into a union of all
 * tables at once. Correctness at this layer comes from the Zod schemas on the
 * ResourceDefinition and from RLS, not from the Database generic.
 *
 * Individual modules keep full type safety: they type their own definition.
 */
const untyped = async (): Promise<SupabaseClient> =>
  (await createServerSupabase()) as unknown as SupabaseClient;

/**
 * Turns a ResourceDefinition into the five REST handlers for
 * /api/v1/<name>/[[...id]].
 *
 * Deliberately runs every query through the USER-scoped Supabase client, so
 * RLS is enforced on each one. The factory never touches the admin client:
 * a bug here can leak nothing that the database policies would not already
 * have allowed.
 */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

type RouteContext = {
  // Next 15: dynamic params arrive as a Promise and must be awaited.
  params: Promise<{ id?: string[] }>;
};

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

const fail = (message: string, status: number, details?: unknown) =>
  json({ error: { message, ...(details ? { details } : {}) } }, status);

/** Maps a PostgREST error onto a sensible HTTP status. */
const fromPostgrest = (error: PostgrestError) => {
  // 42501 = insufficient_privilege, i.e. an RLS policy said no.
  if (error.code === "42501") return fail("Not allowed", 403);
  // 23505 = unique_violation
  if (error.code === "23505") return fail("Already exists", 409, error.details);
  // 23503 = foreign_key_violation
  if (error.code === "23503") return fail("Related record not found", 422, error.details);
  // 23514 = check_violation
  if (error.code === "23514") return fail("Invalid values", 422, error.details);

  return fail(error.message, 400, error.details);
};

const readId = async (context: RouteContext) => {
  const { id } = await context.params;
  return id?.[0];
};

const canRead = (definition: ResourceDefinition, auth: AuthContext) => {
  const allowed = definition.roles?.read;
  if (!allowed || auth.role === "super_admin") return true;
  return auth.role !== null && allowed.includes(auth.role);
};

const canWrite = (definition: ResourceDefinition, auth: AuthContext) => {
  const allowed = definition.roles?.write;
  if (!allowed || auth.role === "super_admin") return true;
  return auth.role !== null && allowed.includes(auth.role);
};

export const createResourceRoute = <TCreate, TUpdate>(
  definition: ResourceDefinition<TCreate, TUpdate>,
) => {
  const select = definition.select ?? "*";

  /** Resolves auth once and rejects unauthenticated callers. */
  const requireAuth = async () => {
    const auth = await getAuthContext();
    if (!auth) return { auth: null, response: fail("Not signed in", 401) };
    return { auth, response: null };
  };

  const GET = async (request: Request, context: RouteContext) => {
    const { auth, response } = await requireAuth();
    if (!auth) return response;
    if (!canRead(definition, auth)) return fail("Not allowed", 403);

    const supabase = await untyped();
    const id = await readId(context);

    // ---- single record ----
    if (id) {
      const { data, error } = await supabase
        .from(definition.table)
        .select(select)
        .eq("id", id)
        .maybeSingle();

      if (error) return fromPostgrest(error);
      // RLS turns "denied" into "no rows", so this covers both cases and
      // deliberately does not distinguish them — that would leak existence.
      if (!data) return fail("Not found", 404);

      return json({ data });
    }

    // ---- list ----
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT),
    );
    const from = (page - 1) * limit;

    let query = supabase.from(definition.table).select(select, { count: "exact" });

    const search = url.searchParams.get("q")?.trim();
    if (search && definition.searchFields?.length) {
      // Escape PostgREST's or() delimiters so a search string cannot inject
      // extra filter clauses.
      const safe = search.replace(/[,()]/g, " ");
      query = query.or(
        definition.searchFields.map((field) => `${field}.ilike.%${safe}%`).join(","),
      );
    }

    for (const field of definition.filterFields ?? []) {
      const value = url.searchParams.get(field);
      if (value !== null && value !== "" && value !== "all") {
        query = query.eq(field, value);
      }
    }

    const sortColumn = url.searchParams.get("sort") ?? definition.defaultSort?.column;
    if (sortColumn) {
      const ascending =
        url.searchParams.get("order") === "asc" || definition.defaultSort?.ascending === true;
      query = query.order(sortColumn, { ascending });
      // Timestamps tie far more often than they look like they would — a seed
      // run or a bulk import stamps every row with the same value. Postgres is
      // then free to return tied rows in any order, and it picks a different
      // one depending on the plan, so `limit 5` and `limit 50` disagree about
      // which rows come first. That breaks two things: a list read twice can
      // disagree with itself, and paging through ties can repeat or skip rows.
      // Ordering by the primary key last makes the sort total.
      if (sortColumn !== "id") query = query.order("id", { ascending });
    }

    const { data, error, count } = await query.range(from, from + limit - 1);
    if (error) return fromPostgrest(error);

    const total = count ?? 0;

    return json({
      data: data ?? [],
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  };

  const POST = async (request: Request) => {
    const { auth, response } = await requireAuth();
    if (!auth) return response;
    if (!canWrite(definition, auth)) return fail("Not allowed", 403);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("Body must be valid JSON", 400);
    }

    const parsed = definition.createSchema.safeParse(body);
    if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten());

    const payload: Record<string, unknown> = { ...(parsed.data as Record<string, unknown>) };

    if (definition.tenantScoped) {
      // A super_admin may write on behalf of a hospital by passing tenant_id.
      // Everyone else gets theirs stamped from the JWT — a body field cannot
      // override it.
      if (auth.role === "super_admin") {
        if (!payload.tenant_id) return fail("tenant_id is required for super_admin", 422);
      } else {
        if (!auth.tenantId) return fail("No tenant on this account", 403);
        payload.tenant_id = auth.tenantId;
      }
    }

    // Person-owned tables get the same treatment, from the session rather than
    // the body. See ownerColumn on ResourceDefinition.
    if (definition.ownerColumn && !(auth.role === "super_admin" && payload[definition.ownerColumn])) {
      payload[definition.ownerColumn] = auth.userId;
    }

    const supabase = await untyped();
    const { data, error } = await supabase
      .from(definition.table)
      .insert(payload)
      .select(select)
      .single();

    if (error) return fromPostgrest(error);

    return json({ data }, 201);
  };

  const PATCH = async (request: Request, context: RouteContext) => {
    const { auth, response } = await requireAuth();
    if (!auth) return response;
    if (!canWrite(definition, auth)) return fail("Not allowed", 403);

    const id = await readId(context);
    if (!id) return fail("Record id is required", 400);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("Body must be valid JSON", 400);
    }

    const parsed = definition.updateSchema.safeParse(body);
    if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten());

    const payload: Record<string, unknown> = { ...(parsed.data as Record<string, unknown>) };

    // Moving a row between hospitals is never an ordinary update.
    if (definition.tenantScoped && auth.role !== "super_admin") {
      delete payload.tenant_id;
    }

    // updateSchema is createSchema.partial(), so a body where every field is
    // blank validates and then reduces to nothing. Sent on, it updates no rows,
    // maybeSingle() returns null, and the caller gets "Not found" for a record
    // that exists — which is a lie, and impossible to debug from the client.
    const changes = Object.keys(payload).filter((key) => payload[key] !== undefined);
    if (!changes.length) return fail("No changes provided", 400);

    const supabase = await untyped();
    const { data, error } = await supabase
      .from(definition.table)
      .update(payload)
      .eq("id", id)
      .select(select)
      .maybeSingle();

    if (error) return fromPostgrest(error);
    if (!data) return fail("Not found", 404);

    return json({ data });
  };

  const DELETE = async (_request: Request, context: RouteContext) => {
    const { auth, response } = await requireAuth();
    if (!auth) return response;
    if (!canWrite(definition, auth)) return fail("Not allowed", 403);

    const id = await readId(context);
    if (!id) return fail("Record id is required", 400);

    // Before the row goes, not after: a hook that needs something off the row
    // (a doctor's profile_id, to revoke their login) cannot read it once the
    // delete has run. See ResourceDefinition.beforeDelete.
    if (definition.beforeDelete) {
      const refusal = await definition.beforeDelete({
        id,
        auth: { role: auth.role, tenantId: auth.tenantId },
      });
      if (refusal) return fail(refusal, 409);
    }

    const supabase = await untyped();
    const { data, error } = await supabase
      .from(definition.table)
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) return fromPostgrest(error);
    if (!data) return fail("Not found", 404);

    return json({ data });
  };

  return { GET, POST, PATCH, DELETE };
};
