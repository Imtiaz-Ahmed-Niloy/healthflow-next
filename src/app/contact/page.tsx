import Contact from "@/views/Contact";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { createPublicSupabase } from "@/lib/supabase/server";
import { pageIsDrafted } from "@/lib/cms/pages";
import { blocksToContactContent } from "@/data/contactContent";
import { blocksToHero } from "@/data/cmsPageHero";

// Revalidate every 60s. Edits in the CMS show up within a minute without
// needing a redeploy or a cache purge.
export const revalidate = 60;

export default async function ContactPage() {
  const supabase = createPublicSupabase();

  const [{ data, error }, settingsResult] = await Promise.all([
    supabase
      .from("cms_pages")
      .select("blocks")
      .eq("slug", "contact")
      .eq("published", true)
      .maybeSingle(),
    supabase.from("global_settings").select("support_email").maybeSingle(),
  ]);

  if (error) {
    console.error("Failed to load contact page CMS content:", error);
  }
  if (settingsResult.error) {
    console.error("Failed to load the support email for the contact page:", settingsResult.error);
  }

  // Unpublished in the CMS: RLS returns no row to an anonymous reader, so an
  // absent row with no error means a super admin drafted this page.
  if (pageIsDrafted(data, error)) notFound();

  // The CMS keeps the page in both languages; render the visitor's.
  const locale = (await getLocale()) as Locale;
  const hero = blocksToHero(data?.blocks, "contact", locale);
  const content = blocksToContactContent(data?.blocks, locale);

  // The first email card shows the support address from /super/global-settings,
  // the same one the footer shows, so it is changed in one place. Its title and
  // note stay the CMS's; with no address set there, the CMS's own stands.
  const supportEmail = settingsResult.data?.support_email?.trim();
  const firstEmail = content.support.channels.findIndex((c) => c.href.startsWith("mailto:") || c.icon === "Mail");
  if (supportEmail && firstEmail !== -1) {
    content.support.channels = content.support.channels.map((c, i) =>
      i === firstEmail ? { ...c, value: supportEmail, href: `mailto:${supportEmail}` } : c,
    );
  }

  return <Contact hero={hero} content={content} />;
}
