"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BRAND_INFO } from "@/constants/brand";
import LanguageSwitcher from "@/components/site/LanguageSwitcher";
import SectionGlow, { GLOW } from "@/components/site/SectionGlow";
import Footer from "@/components/site/Footer";
import { useAtTop } from "@/components/site/Navbar";
import { useIsPageVisible } from "@/components/site/PublishedPages";

export const PromoBar = () => {
  const t = useTranslations("auth.layout");
  return (
    <div className="bg-gradient-dark text-surface-dark-foreground">
      <div className="container mx-auto py-2.5 flex items-center justify-center gap-4 text-xs flex-wrap">
        <span className="font-bold tracking-widest">{t("flashSale")}</span>
        <span className="opacity-80">{t("promo")}</span>
        <button className="rounded-full bg-accent text-primary px-4 py-1.5 font-bold tracking-wider text-[10px] hover:bg-accent/80 transition-colors">{t("claim")}</button>
      </div>
    </div>
  );
};

export const AuthHeader = () => {
  const pathname = usePathname();
  const onSignUp = pathname === "/signup";
  const atTop = useAtTop();
  const t = useTranslations();
  const isVisible = useIsPageVisible();
  // As the main navbar: a page unpublished in the CMS drops out of the links
  // rather than leading to a 404.
  const navLinks = [
    { label: t("nav.features"), to: "/features" },
    { label: t("nav.pricing"), to: "/pricing" },
    { label: t("nav.about"), to: "/about" },
    { label: t("nav.contact"), to: "/contact" },
  ].filter(l => isVisible(l.to));
  return (
    // See-through at the top of the page, like the main navbar, so the glow
    // runs up behind it; frosted from the first pixel of scroll.
    <header className={`sticky top-0 z-50 border-b transition-colors duration-300 ${atTop ? "border-transparent bg-transparent" : "backdrop-blur-md bg-card/80 md:bg-background/80 border-border/50"}`}>
      {/* Sized down on a phone like the main navbar's: at full size the
          logo, the name, the language switch and the button overran the row. */}
      <nav className="container mx-auto flex items-center justify-between gap-3 py-4">
        <Link href="/" className="flex shrink-0 items-center gap-1.5 md:gap-2 font-display text-xl md:text-2xl font-semibold text-primary">
          <img src={BRAND_INFO.logoMark} alt={`${BRAND_INFO.name} logo`} className="h-7 md:h-9 w-auto" />
          {BRAND_INFO.name}
        </Link>
        <ul className="hidden md:flex items-center gap-10 text-xs font-bold tracking-widest">
          {navLinks.map(l => (
            <li key={l.to}>
              <Link href={l.to} className={`transition-colors ${pathname === l.to ? "text-primary-glow" : "text-foreground/70 hover:text-primary"}`}>
                {l.label.toUpperCase()}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 md:gap-3">
          <LanguageSwitcher compact />
          {/* On the sign-up page the way out is signing in, not the page
              you are already on. */}
          <Link href={onSignUp ? "/signin" : "/signup"} className="whitespace-nowrap rounded-full bg-gradient-dark text-surface-dark-foreground px-4 md:px-6 py-2 md:py-2.5 text-[10px] md:text-xs font-bold tracking-wider hover:opacity-90 transition-opacity">{(onSignUp ? t("nav.signIn") : t("nav.getStarted")).toUpperCase()}</Link>
        </div>
      </nav>
    </header>
  );
};

/**
 * Sign in, sign up and password reset: the homepage's page colour with its
 * hero glow running up behind the see-through header and the form, fading
 * out towards the footer.
 *
 * On a phone the whole page is plain white instead, and the form sits on it
 * without a card: there is no room for a card's inset and a backdrop there.
 */
export const AuthLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex flex-col bg-card md:lp-page-bg overflow-x-clip">
    <PromoBar />
    {/* The header sits inside the glow's area, so the glow shows through it
        while it is see-through, with no negative margins to line up. At
        least a screen tall, so the footer stays below the fold until the
        page is scrolled. */}
    <div className="relative isolate flex-1 min-h-screen">
      <AuthHeader />
      {/* Behind the form and click-through: a positioned layer paints over
          an unpositioned <main>, and without these it swallowed every click. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 hidden md:block">
        <SectionGlow {...GLOW.hero} />
      </div>
      <main className="container mx-auto py-12">{children}</main>
    </div>
    <Footer />
  </div>
);
