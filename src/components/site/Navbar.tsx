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
 * Whether the page is scrolled all the way up — for a header that is
 * see-through there and frosted from the first pixel of scroll. Re-renders
 * only when it flips. The server render assumes the top, where a page loads.
 */
export const useAtTop = () => useSyncExternalStore(subscribeScroll, isAtTop, () => true);

/**
 * `transparentAtTop` (the landing page): no background, blur or border while
 * the page is scrolled all the way up, so the hero's colour runs up behind
 * it; the usual frosted bar returns with the first pixel of scroll.
 */
const Navbar = ({ transparentAtTop = false }: { transparentAtTop?: boolean }) => {
  const [open, setOpen] = useState(false);
  const atTop = useAtTop();
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
        <Link href="/" className="flex items-center gap-1.5 md:gap-2 font-display text-xl md:text-2xl font-semibold text-primary">
          <img src={BRAND_INFO.logoMark} alt={`${BRAND_INFO.name} logo`} className="h-7 md:h-9 w-auto" />
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
        // A white sheet under the bar: the links as a ruled list, then the
        // account buttons, then the language, centred, at the foot.
        <div className="md:hidden border-t border-border/50 bg-card rounded-b-3xl shadow-card animate-fade-up">
          <ul className="container mx-auto pt-2 pb-6 flex flex-col text-sm font-medium">
            {/* Features is desktop-only: the phone menu keeps to pricing,
                about and contact. */}
            {links.filter(l => l.to !== "/features").map((l) => (
              <li key={l.to} className="border-b border-border/50">
                <NavLink
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block py-3.5 text-base transition-colors ${isActive ? "text-primary-glow font-semibold" : "text-foreground/80 hover:text-primary"}`
                  }
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
            {sessionLoading ? null : user ? (
              <li className="pt-5">
                <Link href={home} onClick={() => setOpen(false)} className="flex items-center gap-2 py-1 font-semibold">
                  <Avatar src={user.avatarUrl} name={displayName(user)} className="h-7 w-7 text-[10px]" />
                  {displayName(user)}
                </Link>
              </li>
            ) : (
              // Two equal buttons across the full width, rather than a text
              // link and a small pill.
              <li className="pt-5 grid grid-cols-2 gap-3">
                <Link href="/signin" onClick={() => setOpen(false)}
                  className="rounded-full border border-border py-3 text-center font-semibold text-primary transition-colors hover:bg-muted/60">
                  {t("nav.signIn")}
                </Link>
                <Link href="/signup" onClick={() => setOpen(false)}
                  className="rounded-full bg-primary py-3 text-center font-semibold text-primary-foreground transition-colors hover:bg-primary-glow">
                  {t("nav.getStarted")}
                </Link>
              </li>
            )}
            {/* The language last, under the account actions. */}
            <li className="pt-5 flex justify-center"><LanguageSwitcher /></li>
          </ul>
        </div>
      )}
    </header>
  );
};
export default Navbar;

