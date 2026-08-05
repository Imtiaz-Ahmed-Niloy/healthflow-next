"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef, type AnchorHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type NavLinkCompatProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className"> & {
  to: string;
  className?: string | ((state: { isActive: boolean; isPending: boolean }) => string);
  activeClassName?: string;
  pendingClassName?: string;
  /**
   * Match this path exactly instead of also matching its children. Carried
   * over from react-router, and still needed: without it "/super/cms" stays
   * highlighted while you are on "/super/cms/blog".
   */
  end?: boolean;
};

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, end = false, ...props }, ref) => {
    const pathname = usePathname();
    // usePathname can be null during prerender, so coerce rather than let
    // `boolean | undefined` leak into the className callback.
    const isActive = end
      ? pathname === to
      : pathname === to || Boolean(pathname?.startsWith(`${to}/`));
    const resolvedClassName =
      typeof className === "function"
        ? className({ isActive, isPending: false })
        : cn(className, isActive && activeClassName, pendingClassName);

    return <Link ref={ref} href={to} className={resolvedClassName} {...props} />;
  },
);

NavLink.displayName = "NavLink";

export { NavLink };

