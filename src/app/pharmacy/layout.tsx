import type { ReactNode } from "react";

/**
 * Authenticated panel. Rendered per-request, never prerendered at build time.
 *
 * These pages are client-side and sit behind the proxy's role check, so a
 * static shell buys nothing — and prerendering them fails anyway, because
 * they call RTK Query hooks that need a live store.
 */
export const dynamic = "force-dynamic";

const Layout = ({ children }: { children: ReactNode }) => <>{children}</>;

export default Layout;
