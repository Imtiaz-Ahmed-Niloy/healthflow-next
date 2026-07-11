"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const PromoBar = () => (
  <div className="bg-gradient-dark text-surface-dark-foreground">
    <div className="container mx-auto py-2.5 flex items-center justify-center gap-4 text-xs flex-wrap">
      <span className="font-bold tracking-widest">FLASH SALE</span>
      <span className="opacity-80">Get 30% Off All Medical Supplies</span>
      <button className="rounded-full bg-accent text-primary px-4 py-1.5 font-bold tracking-wider text-[10px] hover:bg-accent/80 transition-colors">CLAIM NOW</button>
    </div>
  </div>
);

const navLinks = [
  { label: "Features", to: "/features" },
  { label: "Pricing", to: "/pricing" },
  { label: "About Us", to: "/about" },
  { label: "Contact", to: "/contact" },
];

export const AuthHeader = () => {
  const pathname = usePathname();
  return (
    <header className="bg-background border-b border-border/50">
      <nav className="container mx-auto flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2 font-display text-2xl font-semibold text-primary">
          <img src="/favicon.png" alt="HealthFlow logo" className="h-12 w-12 object-contain" />
          HealthFlow
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
        <Link href="/signup" className="rounded-full bg-gradient-dark text-surface-dark-foreground px-6 py-2.5 text-xs font-bold tracking-wider hover:opacity-90 transition-opacity">GET STARTED</Link>
      </nav>
    </header>
  );
};

export const AuthFooter = () => (
  <footer className="border-t border-border/50 mt-auto bg-background">
    <div className="container mx-auto py-5 flex flex-wrap items-center justify-between gap-4 text-[11px] tracking-widest font-semibold text-muted-foreground">
      <p>© 2026 HEALTHFLOW</p>
      <ul className="flex flex-wrap gap-6">
        <li><Link href="/privacy" className="hover:text-primary">PRIVACY POLICY</Link></li>
        <li><Link href="/terms" className="hover:text-primary">TERMS OF SERVICE</Link></li>
        <li><Link href="/data-use" className="hover:text-primary">DATA USE POLICY</Link></li>
        <li><Link href="/cookies" className="hover:text-primary">COOKIE SETTINGS</Link></li>
      </ul>
    </div>
  </footer>
);

export const AuthLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex flex-col bg-gradient-hero">
    <PromoBar />
    <AuthHeader />
    <main className="flex-1 container mx-auto py-12">{children}</main>
    <AuthFooter />
  </div>
);

