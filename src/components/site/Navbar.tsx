import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const links = [
    { label: t("nav.features"), to: "/features" },
    { label: t("nav.pricing"), to: "/pricing" },
    { label: t("nav.about"), to: "/about" },
    { label: t("nav.contact"), to: "/contact" },
  ];
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/50">
      <nav className="container mx-auto flex items-center justify-between py-4">
        <Link to="/" className="font-display text-2xl font-semibold text-primary">HealthFlow</Link>
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
          <Link to="/signin" className="text-sm font-semibold text-foreground/70 hover:text-primary tracking-wider">{t("nav.signIn").toUpperCase()}</Link>
          <Link to="/signup" className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-glow transition-colors">{t("nav.getStarted").toUpperCase()}</Link>
        </div>
        <button className="md:hidden text-primary" onClick={() => setOpen(!open)} aria-label="Menu">
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
            <li><Link to="/signin" onClick={() => setOpen(false)} className="block py-1">{t("nav.signIn")}</Link></li>
            <li><Link to="/signup" onClick={() => setOpen(false)} className="inline-flex rounded-full bg-primary px-5 py-2 text-primary-foreground">{t("nav.getStarted")}</Link></li>
          </ul>
        </div>
      )}
    </header>
  );
};
export default Navbar;
