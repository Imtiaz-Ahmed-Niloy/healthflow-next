"use client";

import { useState, useSyncExternalStore } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { NavLink } from "@/components/NavLink";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "./LanguageSwitcher";
import { BRAND_INFO } from "@/constants/brand";
import { useIsPageVisible } from "./PublishedPages";
import { Avatar } from "@/components/common/Avatar";
import { useSession, displayName } from "@/lib/auth/useSession";
import { homePathForRole } from "@/lib/auth/permissions";

const subscribeScroll = (onChange: () => void) => {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
};
const isAtTop = () => window.scrollY <= 0;

/**
 * `transparentAtTop` (the landing page): no background, blur or border while
 * the page is scrolled all the way up, so the hero's colour runs up behind
 * it; the usual frosted bar returns with the first pixel of scroll.
 */
const Navbar = ({ transparentAtTop = false }: { transparentAtTop?: boolean }) => {
  const [open, setOpen] = useState(false);
  // Re-renders only when it flips, not on every scroll event. The server
  // render assumes the top, which is where a page loads.
  const atTop = useSyncExternalStore(subscribeScroll, isAtTop, () => true);
  // The open mobile menu keeps its background, so its links stay readable.
  const clear = transparentAtTop && atTop && !open;
  const t = useTranslations();
  const isVisible = useIsPageVisible();
  const { user, isLoading: sessionLoading } = useSession();
  // Their own panel: a patient's dashboard, a doctor's portal, and so on.
  const home = homePathForRole(user?.role);
  // A page unpublished in the CMS drops out of the nav rather than sitting
  // there as a link to a 404.
  const links = [
    { label: t("nav.features"), to: "/features" },
    { label: t("nav.pricing"), to: "/pricing" },
    { label: t("nav.about"), to: "/about" },
    { label: t("nav.contact"), to: "/contact" },
  ].filter(l => isVisible(l.to));
  return (
    <header className={`sticky top-0 z-50 border-b transition-colors duration-300 ${clear ? "border-transparent bg-transparent" : "backdrop-blur-md bg-background/80 border-border/50"}`}>
      <nav className="container mx-auto flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2 font-display text-2xl font-semibold text-primary">
          <img src={BRAND_INFO.logoMark} alt={`${BRAND_INFO.name} logo`} className="h-12 w-12 object-contain" />
          {BRAND_INFO.name}
        </Link>
        <ul className="hidden md:flex items-center gap-10 text-sm font-medium text-foreground/80">
          {links.map((l) => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                className={({ isActive }) =>
                  `tracking-wider transition-colors ${isActive ? "text-primary-glow" : "hover:text-primary"}`
                }
              >
                {l.label.toUpperCase()}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          {/* Signed in: who you are and the way back to your panel, not an
              offer to sign in. Nothing until the session is known, so a
              signed-in visitor never sees Sign In flash past. */}
          {sessionLoading ? null : user ? (
            // Their name is the way in: it opens their own panel.
            <Link href={home} title={t("nav.dashboard")} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-semibold text-foreground/80 hover:bg-muted/60 hover:text-primary transition-colors">
              <Avatar src={user.avatarUrl} name={displayName(user)} className="h-8 w-8 text-xs" />
              <span className="max-w-[10rem] truncate">{displayName(user)}</span>
            </Link>
          ) : (
            <>
              <Link href="/signin" className="text-sm font-semibold text-foreground/70 hover:text-primary tracking-wider">{t("nav.signIn").toUpperCase()}</Link>
              <Link href="/signup" className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-glow transition-colors">{t("nav.getStarted").toUpperCase()}</Link>
            </>
          )}
        </div>
        <button className="md:hidden text-primary" onClick={() => setOpen(!open)} aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}>
          {open ? <X /> : <Menu />}
        </button>
      </nav>
      {open && (
        <div className="md:hidden border-t border-border/50 bg-background animate-fade-up">
          <ul className="container mx-auto py-4 flex flex-col gap-3 text-sm font-medium">
            {links.map((l) => (
              <li key={l.to}>
                <NavLink to={l.to} onClick={() => setOpen(false)} className="block py-1">{l.label}</NavLink>
              </li>
            ))}
            <li className="pt-2"><LanguageSwitcher /></li>
            {sessionLoading ? null : user ? (
              <li>
                <Link href={home} onClick={() => setOpen(false)} className="flex items-center gap-2 py-1 font-semibold">
                  <Avatar src={user.avatarUrl} name={displayName(user)} className="h-7 w-7 text-[10px]" />
                  {displayName(user)}
                </Link>
              </li>
            ) : (
              <>
                <li><Link href="/signin" onClick={() => setOpen(false)} className="block py-1">{t("nav.signIn")}</Link></li>
                <li><Link href="/signup" onClick={() => setOpen(false)} className="inline-flex rounded-full bg-primary px-5 py-2 text-primary-foreground">{t("nav.getStarted")}</Link></li>
              </>
            )}
          </ul>
        </div>
      )}
    </header>
  );
};
export default Navbar;

