"use client";

import { Facebook, Instagram, Mail, Twitter } from "lucide-react";
import Link from "next/link";
import { BRAND_INFO } from "@/constants/brand";
import { useFooterContent } from "@/data/footerContent";
import { useIsPageVisible } from "./PublishedPages";

/**
 * The footer.
 *
 * Same dark surface as the pricing band, with the same grid, so the bottom of
 * the page belongs to the page. The newsletter sign-up that used to live here
 * is gone: there is nothing behind it to send anyone an email, and a form that
 * quietly does nothing is worse than no form.
 */
const Footer = () => {
  const { content } = useFooterContent();
  const isVisible = useIsPageVisible();

  // Drop links to unpublished pages. A column whose every link is gone goes
  // with them, rather than leaving a bare heading behind.
  const columns = content.columns
    .map(c => ({ ...c, links: c.links.filter(l => isVisible(l.to)) }))
    .filter(c => c.links.length > 0);

  // "#" is the placeholder the defaults ship with. An icon that goes nowhere is
  // worse than one fewer icon, so those are dropped — and if that leaves none,
  // the accounts the company actually has stand in.
  const configured = [
    { href: content.social.twitter, label: "Twitter", Icon: Twitter },
    { href: content.social.facebook, label: "Facebook", Icon: Facebook },
    { href: content.social.instagram, label: "Instagram", Icon: Instagram },
  ].filter(s => s.href && s.href !== "#");

  const socials = configured.length > 0
    ? configured
    : [{ href: BRAND_INFO.facebook, label: "Facebook", Icon: Facebook }];

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
          {/* Who this is, and how to reach them. */}
          <div className="md:col-span-5 lg:col-span-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              {/* The mark is dark teal on transparent — unreadable on this band.
                  brightness-0 flattens it to black, invert takes that to white,
                  which is the white logo without shipping a second file. */}
              <img src={BRAND_INFO.logoMark} alt="" width={44} height={44} className="h-11 w-11 object-contain brightness-0 invert" />
              <span className="font-display text-2xl">{content.brand}</span>
            </Link>
            <p className="opacity-70 mt-4 max-w-xs text-sm leading-relaxed">{content.tagline}</p>

            <a
              href={`mailto:${BRAND_INFO.email}`}
              className="mt-5 inline-flex items-center gap-2 text-sm opacity-80 hover:opacity-100 transition-opacity"
            >
              <Mail className="h-4 w-4" />
              {BRAND_INFO.email}
            </a>

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

          {/* The link columns take the rest of the row and share it evenly,
              however many of them survive the published-pages filter. */}
          <div className="md:col-span-7 lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {columns.map(c => (
              <div key={c.title}>
                <h4 className="text-xs font-bold tracking-widest opacity-60">{c.title}</h4>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {c.links.map(l => (
                    <li key={l.label}>
                      <Link
                        href={l.to}
                        className="inline-block opacity-80 transition-all hover:opacity-100 hover:translate-x-0.5"
                      >
                        {l.label}
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
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 py-5 text-xs opacity-60">
          <span>{content.rights}</span>
          <a href="https://healthflowbd.com" className="hover:opacity-100 transition-opacity">healthflowbd.com</a>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
