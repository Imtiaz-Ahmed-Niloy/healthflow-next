import type { ReactNode } from "react";

/**
 * Authenticated Laboratory Information Management System (LIMS) panel.
 * Gated by prefix "/lab" in proxy.ts.
 */
export const dynamic = "force-dynamic";

const Layout = ({ children }: { children: ReactNode }) => <>{children}</>;

export default Layout;
