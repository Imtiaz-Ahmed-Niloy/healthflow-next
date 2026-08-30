/**
 * The public routes the CMS manages.
 *
 * This mirrors the seed in `0040_cms_pages_registry.sql`. It exists because
 * the published set alone cannot answer the question the navigation asks.
 * Anonymous visitors can only read published rows (that is the RLS policy),
 * so a drafted page and a page nobody ever registered look identical from the
 * browser — both are simply absent. Comparing against this list separates
 * them: a managed path missing from the published set is drafted and its
 * links come out of the nav; an unmanaged path (a doctor profile, an external
 * link) is left alone.
 *
 * Add a route here when you add it to the seed, and not otherwise.
 */
export const MANAGED_PATHS = [
  "/",
  "/features",
  "/pricing",
  "/about",
  "/contact",
  "/blog",
  "/hospitals",
  "/doctors",
  "/lab-tests",
  "/reserve-room",
  "/telehealth",
  "/career",
  "/help-center",
  "/privacy",
  "/terms",
  "/data-use",
  "/cookies",
  "/signin",
  "/signup",
] as const;

export type ManagedPath = (typeof MANAGED_PATHS)[number];

const managed = new Set<string>(MANAGED_PATHS);

export const isManagedPath = (path: string): boolean => managed.has(path);

/**
 * The route a page slug lives at.
 *
 * Every page in the register is seeded by a migration, so this is only needed
 * by the editors' "create the row if it is somehow missing" fallback — the
 * row's `path` is NOT NULL and the editor knows the slug, not the route.
 * Home is the one page whose path is not just its slug.
 */
export const pathForSlug = (slug: string): string => (slug === "home" ? "/" : `/${slug}`);

/**
 * Sign-in and sign-up cannot be unpublished — drafting them would lock every
 * user out of the app, including the super admin who would have to undo it.
 * The database enforces this (`cms_pages_protected_stays_published`); the UI
 * reads it off the row's `protected` flag rather than this list.
 */
export const PROTECTED_PATHS: readonly string[] = ["/signin", "/signup"];
