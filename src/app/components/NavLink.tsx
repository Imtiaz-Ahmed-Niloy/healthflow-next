"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentProps, forwardRef } from "react";
import { cn } from "@/lib/utils";

type NavLinkState = {
  isActive: boolean;
  isPending: boolean;
};

type NextLinkProps = ComponentProps<typeof Link>;

type NavLinkCompatProps = Omit<NextLinkProps, "href" | "className"> & {
  to: NextLinkProps["href"];
  className?: string | ((state: NavLinkState) => string);
  activeClassName?: string;
  pendingClassName?: string;
};

function getPathname(href: NextLinkProps["href"]) {
  const value = typeof href === "string" ? href : href.pathname ?? "/";
  return value.split(/[?#]/)[0] || "/";
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    const pathname = usePathname();
    const targetPath = getPathname(to);
    const isActive =
      pathname === targetPath || (targetPath !== "/" && pathname.startsWith(`${targetPath}/`));
    const isPending = false;
    const resolvedClassName =
      typeof className === "function"
        ? className({ isActive, isPending })
        : cn(className, isActive && activeClassName, isPending && pendingClassName);

    return (
      <Link
        ref={ref}
        href={to}
        className={resolvedClassName}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
