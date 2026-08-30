"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { isManagedPath } from "@/constants/sitePages";

/**
 * Which public pages a visitor may be linked to.
 *
 * The root layout reads the published set once (cached, see
 * `lib/cms/pages.ts`) and hands it down here, so the navigation and footer can
 * drop links to pages a super admin has unpublished. Without this a drafted
 * page would still be linked from every page on the site and simply 404 when
 * clicked.
 *
 * `null` means "we could not find out" and hides nothing — see the fail-open
 * note on getPublishedPaths.
 */
const PublishedPathsContext = createContext<string[] | null>(null);

export const PublishedPathsProvider = ({
  paths,
  children,
}: {
  paths: string[] | null;
  children: ReactNode;
}) => (
  <PublishedPathsContext.Provider value={paths}>{children}</PublishedPathsContext.Provider>
);

/** Strips query and hash, and normalises "/features/" to "/features". */
const normalise = (href: string): string => {
  const path = href.split("?")[0].split("#")[0];
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
};

/**
 * Returns a predicate: is this link safe to show?
 *
 * Anything the CMS does not manage — an external URL, a doctor profile, an
 * anchor — is always shown. Only a managed path that is missing from the
 * published set gets hidden.
 */
export const useIsPageVisible = () => {
  const paths = useContext(PublishedPathsContext);

  return useMemo(() => {
    if (!paths) return () => true;
    const published = new Set(paths);
    return (href: string) => {
      if (!href.startsWith("/")) return true;
      const path = normalise(href);
      return isManagedPath(path) ? published.has(path) : true;
    };
  }, [paths]);
};
