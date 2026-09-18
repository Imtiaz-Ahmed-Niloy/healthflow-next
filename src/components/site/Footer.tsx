"use client";

import { Facebook, Instagram, Linkedin, Mail, Phone, Twitter } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BRAND_INFO } from "@/constants/brand";
import { defaultFooterContent, useFooterContent } from "@/data/footerContent";
import { useIsPageVisible } from "./PublishedPages";

/**
 * The footer.
 *
 * Same dark surface as the pricing band, with the same grid, so the bottom of
 * the page belongs to the page. The newsletter sign-up that used to live here
 * is gone: there is nothing behind it to send anyone an email, and a form that
 * quietly does nothing is worse than no form.
 */
/** The default columns and links, by the English words and paths they ship with. */
const COLUMN_KEYS = { Resources: "resources", Legal: "legal" } as const;
const LINK_KEYS = {
  "/help-center": "helpCenter", "/blog": "blog", "/career": "career",
  "/privacy": "privacy", "/terms": "terms", "/data-use": "dataUse", "/cookies": "cookies",
} as const;

const Footer = () => {
  const t = useTranslations("footer");
  const { content } = useFooterContent();
  const isVisible = useIsPageVisible();

  /**
   * Text still at its shipped default is translated; text someone changed is
   * shown as they wrote it. The overrides live in this browser's storage only
   * (data/footerContent.ts), so in practice every visitor sees the defaults.
   */
  const text = (value: string, fallback: string, translated: string) =>
    value === fallback ? translated : value;
  const columnTitle = (title: string) =>
    title in COLUMN_KEYS ? t(`columns.${COLUMN_KEYS[title as keyof typeof COLUMN_KEYS]}`) : title;
  const linkLabel = (label: string, to: string) => {
    const shipped = defaultFooterContent.columns.flatMap(c => c.links).find(l => l.to === to)?.label;
    return to in LINK_KEYS && label === shipped ? t(`links.${LINK_KEYS[to as keyof typeof LINK_KEYS]}`) : label;
  };

  // Drop links to unpublished pages. A column whose every link is gone goes
  // with them, rather than leaving a bare heading behind.
  const columns = content.columns
    .map(c => ({ ...c, links: c.links.filter(l => isVisible(l.to)) }))
    .filter(c => c.links.length > 0);

  // "#" is the placeholder the defaults ship with. An icon that goes nowhere is
  // worse than one fewer icon, so those are dropped — and if that leaves none,
  // the accounts the company actually has stand in.
  const configured = [
    { href: content.social.facebook, label: "Facebook", Icon: Facebook },
    { href: content.social.linkedin, label: "LinkedIn", Icon: Linkedin },
    { href: content.social.twitter, label: "Twitter", Icon: Twitter },
    { href: content.social.instagram, label: "Instagram", Icon: Instagram },
  ].filter(s => s.href && s.href !== "#");

  // Tailwind reads class names literally, so the track count is picked from
  // written-out classes rather than built into a string it would never see.
  const columnTracks =
    ["md:grid-cols-1", "md:grid-cols-1", "md:grid-cols-2", "md:grid-cols-3"][Math.min(columns.length, 3)];

  const socials = configured.length > 0
    ? configured
    : [
        { href: BRAND_INFO.facebook, label: "Facebook", Icon: Facebook },
        { href: BRAND_INFO.linkedin, label: "LinkedIn", Icon: Linkedin },
      ];

  return (
    <footer id="cta" className="relative overflow-hidden bg-gradient-dark text-surface-dark-foreground">
      {/* The same treatment as the pricing band above it: a little colour, and
          a grid fading out before it reaches the edges. */}
      <div aria-hidden className="absolute -top-40 left-[10%] h-[28rem] w-[28rem] rounded-full bg-[hsl(152_70%_52%)]/20 blur-[130px]" />
      <div aria-hidden className="absolute -bottom-40 right-[8%] h-[26rem] w-[26rem] rounded-full bg-[hsl(199_80%_52%)]/15 blur-[120px]" />
      <div
        aria-hidden
        className="absolute inset-0 [background-image:linear-gradient(hsl(0_0%_100%/0.05)_1px,transparent_1px),linear-gradient(90deg,hsl(0_0%_100%/0.05)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(110%_100%_at_50%_0%,black_5%,transparent_70%)] [-webkit-mask-image:radial-gradient(110%_100%_at_50%_0%,black_5%,transparent_70%)]"
      />

      <div className="relative container mx-auto py-16 md:py-20">
        <div className="grid gap-10 md:grid-cols-12">
          {/* Who this is, what it does, and how to reach them. This column
              carries the description, so it gets the wider half of the row. */}
          <div className="md:col-span-8 lg:col-span-9">
            <Link href="/" className="inline-flex items-center gap-2.5">
              {/* The mark is dark teal on transparent — unreadable on this band.
                  brightness-0 flattens it to black, invert takes that to white,
                  which is the white logo without shipping a second file. */}
              <img src={BRAND_INFO.logoMark} alt="" className="h-9 w-auto brightness-0 invert" />
              <span className="font-display text-2xl">{content.brand}</span>
            </Link>
            <p className="mt-4 max-w-md text-base leading-relaxed opacity-90">{text(content.tagline, defaultFooterContent.tagline, t("tagline"))}</p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed opacity-70">{text(content.description, defaultFooterContent.description, t("description"))}</p>

            {/* Email and phone as chips, sharing the social buttons' border and
                tile so the whole block below the description reads as one set
                rather than two loose lines of text. */}
            <div className="mt-6 flex flex-wrap gap-3">
              {[
                { href: `mailto:${BRAND_INFO.email}`, label: t("email"), value: BRAND_INFO.email, Icon: Mail },
                // tel: wants the number without the spaces it is printed with.
                { href: `tel:${BRAND_INFO.phone.replace(/\s+/g, "")}`, label: t("phone"), value: BRAND_INFO.phone, Icon: Phone },
              ].map(({ href, label, value, Icon }) => (
                <a
                  key={label}
                  href={href}
                  className="group inline-flex items-center gap-3 rounded-full border border-surface-dark-foreground/15 bg-surface-dark-foreground/5 py-2 pl-2 pr-5 transition-all hover:border-accent/50 hover:bg-surface-dark-foreground/10"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-dark-foreground/10 transition-colors group-hover:bg-accent group-hover:text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="leading-tight">
                    <span className="block text-[0.7rem] uppercase tracking-wider opacity-50">{label}</span>
                    <span className="block text-sm opacity-90">{value}</span>
                  </span>
                </a>
              ))}
            </div>

            <div className="mt-6 flex gap-2.5">
              {socials.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noreferrer"
                  className="grid h-9 w-9 place-items-center rounded-full border border-surface-dark-foreground/20 bg-surface-dark-foreground/5 transition-all hover:bg-accent hover:text-primary hover:border-accent"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* The description takes three quarters of the row, so the links
              share the last quarter. The track count follows how many columns
              survived the published-pages filter, rather than being fixed at
              two — otherwise a column that drops out leaves a hole where it
              used to be. */}
          <div className={`md:col-span-4 lg:col-span-3 grid grid-cols-2 ${columnTracks} gap-8 lg:gap-10`}>
            {columns.map(c => (
              <div key={c.title}>
                <h4 className="text-xs font-bold tracking-widest opacity-60">{columnTitle(c.title)}</h4>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {c.links.map(l => (
                    <li key={l.label}>
                      <Link
                        href={l.to}
                        className="inline-block opacity-80 transition-all hover:opacity-100 hover:translate-x-0.5"
                      >
                        {linkLabel(l.label, l.to)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative border-t border-surface-dark-foreground/10">
        <div className="container mx-auto py-5 text-xs opacity-60">
          <span>{text(content.rights, defaultFooterContent.rights, t("rights"))}</span>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
