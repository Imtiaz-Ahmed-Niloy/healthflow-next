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
};

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    const pathname = usePathname();
    const isActive = pathname === to || pathname?.startsWith(`${to}/`);
    const resolvedClassName =
      typeof className === "function"
        ? className({ isActive, isPending: false })
        : cn(className, isActive && activeClassName, pendingClassName);

    return <Link ref={ref} href={to} className={resolvedClassName} {...props} />;
  },
);

NavLink.displayName = "NavLink";

export { NavLink };

