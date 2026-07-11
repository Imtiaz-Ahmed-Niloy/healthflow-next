"use client";

import { ArrowRight, Twitter, Facebook, Instagram } from "lucide-react";
import Link from "next/link";
import { useFooterContent } from "@/data/footerContent";

const Footer = () => {
  const { content } = useFooterContent();
  return (
    <footer id="cta" className="bg-gradient-dark text-surface-dark-foreground">
      <div className="container mx-auto py-16 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="font-display text-2xl">{content.brand}</div>
          <p className="opacity-70 mt-3 max-w-xs text-sm">{content.tagline}</p>
        </div>
        {content.columns.map(c => (
          <div key={c.title}>
            <h4 className="text-xs font-bold tracking-widest opacity-60">{c.title}</h4>
            <ul className="mt-4 space-y-2 text-sm">
              {c.links.map(l => (
                <li key={l.label}>
                  <Link href={l.to} className="opacity-80 hover:opacity-100 transition-opacity">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h4 className="text-xs font-bold tracking-widest opacity-60">{content.newsletterTitle}</h4>
          <form className="mt-4 flex items-center gap-2 rounded-full bg-surface-dark-foreground/10 p-1.5 border border-surface-dark-foreground/15">
            <input
              type="email"
              placeholder={content.newsletterPlaceholder}
              className="bg-transparent flex-1 px-3 py-1.5 text-sm outline-none placeholder:text-surface-dark-foreground/50"
            />
            <button
              aria-label="Subscribe"
              className="rounded-full bg-accent text-primary p-2 hover:bg-accent/80 transition-colors"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
          <div className="mt-5 flex gap-3 opacity-80">
            <a href={content.social.twitter} aria-label="Twitter" className="hover:opacity-100">
              <Twitter className="h-4 w-4" />
            </a>
            <a href={content.social.facebook} aria-label="Facebook" className="hover:opacity-100">
              <Facebook className="h-4 w-4" />
            </a>
            <a href={content.social.instagram} aria-label="Instagram" className="hover:opacity-100">
              <Instagram className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-surface-dark-foreground/10">
        <div className="container mx-auto py-5 text-xs opacity-60">{content.rights}</div>
      </div>
    </footer>
  );
};
export default Footer;

