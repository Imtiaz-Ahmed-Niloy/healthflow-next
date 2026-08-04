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

  /** Default ordering for list responses. */
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
