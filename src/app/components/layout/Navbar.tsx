"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import LanguageSwitcher from "@/components/site/LanguageSwitcher";
import logo from "@/assets/healthflow-mark.png";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useTranslation();

  const links = [
    { label: t("nav.features"), href: "/features" },
    { label: t("nav.pricing"), href: "/pricing" },
    { label: t("nav.about"), href: "/about" },
    { label: t("nav.contact"), href: "/contact" },
  ];

  const isActive = (href: string) => {
    return pathname === href;
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/50">
      <nav className="container mx-auto flex items-center justify-between py-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-2xl font-semibold text-primary"
          onClick={() => setOpen(false)}
        >
          <Image
            src={logo}
            alt="HealthFlow logo"
            width={48}
            height={48}
            className="h-12 w-12 object-contain"
            priority
          />
          HealthFlow
        </Link>

        <ul className="hidden md:flex items-center gap-10 text-sm font-medium text-foreground/80">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`tracking-wider transition-colors ${
                  isActive(link.href)
                    ? "text-primary-glow"
                    : "hover:text-primary"
                }`}
              >
                {link.label.toUpperCase()}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />

          <Link
            href="/signin"
            className="text-sm font-semibold text-foreground/70 hover:text-primary tracking-wider"
          >
            {t("nav.signIn").toUpperCase()}
          </Link>

          <Link
            href="/signup"
            className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-glow transition-colors"
          >
            {t("nav.getStarted").toUpperCase()}
          </Link>
        </div>

        <button
          type="button"
          className="md:hidden text-primary"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Menu"
        >
          {open ? <X /> : <Menu />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden border-t border-border/50 bg-background animate-fade-up">
          <ul className="container mx-auto py-4 flex flex-col gap-3 text-sm font-medium">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`block py-1 ${
                    isActive(link.href)
                      ? "text-primary-glow"
                      : "hover:text-primary"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}

            <li className="pt-2">
              <LanguageSwitcher />
            </li>

            <li>
              <Link
                href="/signin"
                onClick={() => setOpen(false)}
                className="block py-1"
              >
                {t("nav.signIn")}
              </Link>
            </li>

            <li>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="inline-flex rounded-full bg-primary px-5 py-2 text-primary-foreground"
              >
                {t("nav.getStarted")}
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
};

export default Navbar;