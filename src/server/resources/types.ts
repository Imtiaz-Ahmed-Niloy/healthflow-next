import type { z } from "zod";
import type { AppRole } from "@/lib/supabase/server";

/**
 * Everything the backend needs to know about a module.
 *
 * This is the whole of a module's server-side code. A new module is this
 * object plus a migration plus a one-line route file — see docs/module-guide.md.
 */
export type ResourceDefinition<TCreate = unknown, TUpdate = unknown> = {
  /** URL segment and RTK Query tag. Must match the folder under /api/v1. */
  name: string;

  /** Postgres table in the public schema. */
  table: string;

  /**
   * Whether rows carry a tenant_id.
   *
   * When true the factory stamps tenant_id from the caller's JWT on create,
   * so a client cannot write into another hospital by forging a body field.
   * RLS blocks it regardless; this makes the intent explicit and gives a
   * clearer error than a policy violation.
   *
   * Set false only for genuinely global tables (packages, roles, lookups).
   */
  tenantScoped: boolean;

  /**
   * Validates POST bodies.
   *
   * The input type is `unknown` rather than TCreate because request bodies
   * arrive unparsed, and because schemas that use .transform() (coercing
   * form strings to numbers, "" to undefined) have an input type that
   * differs from their output.
   */
  createSchema: z.ZodType<TCreate, z.ZodTypeDef, unknown>;

  /** Validates PATCH bodies. Usually createSchema.partial(). */
  updateSchema: z.ZodType<TUpdate, z.ZodTypeDef, unknown>;

  /** PostgREST select list. Use this to embed relations. Defaults to "*". */
  select?: string;

  /** Columns matched with ilike when ?q= is present. */
  searchFields?: string[];

  /** Columns accepted as exact-match filters via query string. */
  filterFields?: string[];

  /**
   * Default ordering for list responses.
   *
   * The convention is `{ column: "created_at", ascending: false }` — newest
   * first, so a row someone just added is at the top of the table instead of
   * wherever the alphabet happens to put it. Several modules used to sort by
   * name or number and a new entry would land in the middle of page three.
   *
   * Only depart from it when the table has a domain date that IS the recency
   * the reader wants — `appointments.scheduled_date`, `admissions.admitted_at`,
   * `bed_stays.started_at`, `cms_pages.updated_at`. Those are the only four,
   * and each still sorts descending.
   *
   * This is the list order only; the UI's own sorting is untouched, and
   * DataTable leaves rows alone until a column header is clicked.
   */
  defaultSort?: { column: string; ascending?: boolean };

  /**
   * Optional role gate applied BEFORE the query runs.
   *
   * This is defence in depth, not the security boundary — RLS is. Use it to
   * return a clean 403 instead of a confusing empty list when a role has no
   * business touching a module at all.
   */
  roles?: {
    read?: AppRole[];
    write?: AppRole[];
  };

  /**
   * Runs after the caller is authorised but BEFORE the row is deleted, for the
   * side effects that have to happen while the row is still readable.
   *
   * Deleting a doctor has to revoke their login (HF-75), and the profile id
   * lives on the row being deleted. Reading it afterwards is not possible and
   * reading it from the client cannot be trusted.
   *
   * Return a message to abort the delete with a 409 and leave the row alone.
   * Return nothing to proceed. Throwing is not a way to veto — it is a 500.
   *
   * Runs with the caller's own client, so RLS still applies and a hook cannot
   * be used to reach across tenants.
   */
  beforeDelete?: (context: {
    id: string;
    auth: { role: AppRole | null; tenantId: string | null };
  }) => Promise<string | void>;
};

/** Shape every list endpoint returns. */
export type ListResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/** Shape every single-record endpoint returns. */
export type ItemResponse<T> = { data: T };
