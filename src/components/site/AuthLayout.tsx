"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BRAND_INFO } from "@/constants/brand";
import LanguageSwitcher from "@/components/site/LanguageSwitcher";

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
  const t = useTranslations();
  const navLinks = [
    { label: t("nav.features"), to: "/features" },
    { label: t("nav.pricing"), to: "/pricing" },
    { label: t("nav.about"), to: "/about" },
    { label: t("nav.contact"), to: "/contact" },
  ];
  return (
    <header className="bg-background border-b border-border/50">
      <nav className="container mx-auto flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2 font-display text-2xl font-semibold text-primary">
          <img src={BRAND_INFO.logoMark} alt={`${BRAND_INFO.name} logo`} className="h-9 w-auto" />
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
        <div className="flex items-center gap-3">
          <LanguageSwitcher compact />
          <Link href="/signup" className="rounded-full bg-gradient-dark text-surface-dark-foreground px-6 py-2.5 text-xs font-bold tracking-wider hover:opacity-90 transition-opacity">{t("nav.getStarted").toUpperCase()}</Link>
        </div>
      </nav>
    </header>
  );
};

export const AuthFooter = () => {
  const t = useTranslations("auth.layout");
  return (
    <footer className="border-t border-border/50 mt-auto bg-background">
      <div className="container mx-auto py-5 flex flex-wrap items-center justify-between gap-4 text-[11px] tracking-widest font-semibold text-muted-foreground">
        <p>{BRAND_INFO.copyrightUppercase}</p>
        <ul className="flex flex-wrap gap-6">
          <li><Link href="/privacy" className="hover:text-primary">{t("privacy")}</Link></li>
          <li><Link href="/terms" className="hover:text-primary">{t("terms")}</Link></li>
          <li><Link href="/data-use" className="hover:text-primary">{t("dataUse")}</Link></li>
          <li><Link href="/cookies" className="hover:text-primary">{t("cookies")}</Link></li>
        </ul>
      </div>
    </footer>
  );
};

export const AuthLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex flex-col bg-gradient-hero">
    <PromoBar />
    <AuthHeader />
    <main className="flex-1 container mx-auto py-12">{children}</main>
    <AuthFooter />
  </div>
);
