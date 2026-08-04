import type { ReactNode } from "react";

/**
 * Authenticated panel. Rendered per-request, never prerendered at build time.
 *
 * These pages are client-side and sit behind middleware auth, so a static
 * shell buys nothing — and prerendering them fails anyway, because the
 * config-driven CRUD engine calls RTK Query hooks that need a live store.
 */
export const dynamic = "force-dynamic";

const Layout = ({ children }: { children: ReactNode }) => <>{children}</>;

export default Layout;
