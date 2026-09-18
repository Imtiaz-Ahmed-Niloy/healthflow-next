"use client";

import { ReactNode, useEffect, useState } from "react";
import { BadgeCheck, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { NavLink } from "@/components/NavLink";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Building2, ShieldCheck, FileBarChart, Package, Globe2, ListChecks,
  FileCode2, Receipt, Settings, LogOut, Bell, Menu, X, Network, Megaphone, LifeBuoy, ScrollText, Mail,
  ChevronDown, Stethoscope, Users, Tags,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { NotificationProvider, useNotifications } from "@/components/admin/NotificationProvider";
import { CommandPalette } from "@/components/admin/CommandPalette";
import { Drawer } from "@/components/admin/crud";
import { Pill as Badge } from "@/components/admin/ui";
import { formatDistanceToNow } from "date-fns";
import LanguageSwitcher from "@/components/site/LanguageSwitcher";
import { HeaderClock } from "@/components/common/HeaderClock";
import { useSession, displayName } from "@/lib/auth/useSession";
import { Avatar } from "@/components/common/Avatar";
import { useRoleLabel } from "@/i18n/useRoleLabel";
import { BRAND_INFO } from "@/constants/brand";

/**
 * The super admin menu. `key` names the label in the "superNav" messages and
 * `group` names its heading there.
 */
export const superNav = [
  { to: "/super/dashboard", icon: LayoutDashboard, key: "dashboard", group: "overview" },
  // No separate onboarding queue: Hospital Management lists every hospital and
  // `pending` is the queue. /super/onboarding redirects there.
  { to: "/super/hospitals", icon: Building2, key: "hospitals", group: "tenants" },
  { to: "/super/roles", icon: ShieldCheck, key: "roles", group: "tenants" },
  { to: "/super/package-management", icon: Package, key: "packages", group: "tenants" },
  // People, not hospital rows: one entry per doctor or patient however many
  // hospitals they're at (0077) — so they sit in their own group, not Tenants.
  { to: "/super/doctors", icon: Stethoscope, key: "doctors", group: "people" },
  { to: "/super/specialties", icon: Tags, key: "specialties", group: "people" },
  { to: "/super/patients", icon: Users, key: "patients", group: "people" },
  { to: "/super/logs", icon: FileBarChart, key: "logs", group: "monitoring" },
  { to: "/super/verification", icon: BadgeCheck, key: "verification", group: "monitoring" },
  { to: "/super/whitelisting", icon: ListChecks, key: "whitelisting", group: "monitoring" },
  { to: "/super/billing", icon: Receipt, key: "billing", group: "commerce" },
  { to: "/super/cms", icon: FileCode2, key: "cms", group: "content" },
  { to: "/super/announcements", icon: Megaphone, key: "announcements", group: "content" },
  { to: "/super/ads", icon: ImageIcon, key: "ads", group: "content" },
  { to: "/super/contact-messages", icon: Mail, key: "contactMessages", group: "content" },
  { to: "/super/tickets", icon: LifeBuoy, key: "tickets", group: "system" },
  { to: "/super/integrations", icon: Network, key: "integrations", group: "system" },
  { to: "/super/global-settings", icon: Globe2, key: "globalSettings", group: "system" },
  { to: "/super/settings", icon: Settings, key: "preferences", group: "system" },
] as const;

const grouped = superNav.reduce<Record<string, (typeof superNav)[number][]>>((a, i) => {
  (a[i.group] ||= []).push(i); return a;
}, {});

const CMS_SUBLINKS = [
  { to: "/super/cms/home", key: "home" },
  { to: "/super/cms/features", key: "features" },
  { to: "/super/cms/pricing", key: "pricing" },
  { to: "/super/cms/about", key: "about" },
  { to: "/super/cms/contact", key: "contact" },
  { to: "/super/cms/blog", key: "blog" },
] as const;

export const SuperSidebar = ({ onNavigate }: { onNavigate?: () => void }) => {
  const t = useTranslations("superNav");
  const pathname = usePathname();
  const cmsActive = Boolean(pathname?.startsWith("/super/cms"));
  const [cmsOpen, setCmsOpen] = useState(cmsActive);
  useEffect(() => { if (cmsActive) setCmsOpen(true); }, [cmsActive]);

  return (
  <aside className="w-64 bg-chip/40 border-r border-border/50 flex flex-col py-6 sticky top-0 h-screen shrink-0 overflow-hidden">
    <Link href="/" className="px-6 flex items-center gap-2">
      <img src={BRAND_INFO.logo} alt={`${BRAND_INFO.name} logo`} className="h-12 w-12 object-contain" />
      <div>
        <div className="font-display text-xl text-primary font-bold">{BRAND_INFO.name}</div>
        <p className="text-[10px] tracking-widest font-semibold text-primary-glow mt-0.5">{t("panel")}</p>
      </div>
    </Link>
    <nav className="mt-8 px-3 flex-1 flex flex-col gap-4 overflow-y-auto">
      {Object.entries(grouped).map(([g, items]) => (
        <div key={g}>
          <p className="px-3 mb-1.5 text-[10px] tracking-widest font-bold text-muted-foreground/70">
            {t(`groups.${g as (typeof superNav)[number]["group"]}`).toUpperCase()}
          </p>
          <div className="flex flex-col gap-0.5">
            {items.map(l => {
              if (l.to === "/super/cms") {
                return (
                  <div key={l.to}>
                    <button
                      type="button"
                      onClick={() => setCmsOpen(o => !o)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                        cmsActive ? "bg-card text-primary shadow-soft" : "text-foreground/70 hover:bg-card/60"
                      }`}
                    >
                      <l.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate flex-1 text-left">{t(`links.${l.key}`)}</span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${cmsOpen ? "rotate-180" : ""}`} />
                    </button>
                    {cmsOpen && (
                      <div className="mt-1 ml-4 pl-3 border-l border-border/60 flex flex-col gap-0.5">
                        <NavLink
                          to="/super/cms"
                          end
                          onClick={onNavigate}
                          className={({ isActive }) =>
                            `px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                              isActive ? "bg-card text-primary" : "text-foreground/60 hover:text-primary hover:bg-card/40"
                            }`
                          }
                        >
                          {t("cmsOverview")}
                        </NavLink>
                        {CMS_SUBLINKS.map(s => (
                          <NavLink key={s.to} to={s.to} onClick={onNavigate}
                            className={({ isActive }) =>
                              `px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                                isActive ? "bg-card text-primary" : "text-foreground/60 hover:text-primary hover:bg-card/40"
                              }`
                            }>
                            {t(`cms.${s.key}`)}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <NavLink key={l.to} to={l.to} onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                      isActive ? "bg-card text-primary shadow-soft" : "text-foreground/70 hover:bg-card/60"
                    }`
                  }>
                  <l.icon className="h-4 w-4 shrink-0" /> <span className="truncate">{t(`links.${l.key}`)}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
    <div className="px-6 pt-4 text-[10px] tracking-widest font-semibold text-muted-foreground">{BRAND_INFO.copyrightUppercase}</div>
  </aside>
  );
};

const TopbarInner = ({ title, subtitle, onMenu, menuOpen }: { title: string; subtitle?: string; onMenu: () => void; menuOpen: boolean }) => {
  const tc = useTranslations("common");
  const tn = useTranslations("adminNav");
  const roleLabel = useRoleLabel();
  const router = useRouter();
  const { user, signOut } = useSession();
  const { items, unread, markAllRead } = useNotifications();
  const [palette, setPalette] = useState(false);
  const [drawer, setDrawer] = useState(false);
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setPalette(true); } };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);
  return (
    <>
      <header className="bg-card border-b border-border/50 sticky top-0 z-30">
        <div className="flex items-center justify-between gap-4 px-4 lg:px-8 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <button className="lg:hidden p-2 -ml-2" onClick={onMenu}>
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-2xl text-primary truncate">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3 lg:gap-5">
            <HeaderClock />
            <LanguageSwitcher compact />
            <button onClick={() => setDrawer(true)} aria-label={tc("notifications")} className="relative text-foreground/70 hover:text-primary">
              <Bell className="h-5 w-5" />
              {unread > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold grid place-items-center">{unread}</span>}
            </button>
            <div className="hidden sm:flex items-center gap-3 border-l border-border/60 pl-5">
              <div className="text-right">
                <p className="font-semibold text-sm text-primary leading-tight">{displayName(user)}</p>
                <p className="text-[10px] tracking-widest font-bold text-primary-glow">{roleLabel(user?.role).toUpperCase()}</p>
              </div>
              {/* Initials until there is a picture — Avatar decides. */}
              <Avatar src={user?.avatarUrl} name={displayName(user)} />
            </div>
            <button onClick={async () => { await signOut(); toast.success(tc("signedOut")); router.replace("/signin"); router.refresh(); }}
              className="hidden md:flex items-center gap-2 text-sm font-semibold text-foreground/70 hover:text-destructive">
              <LogOut className="h-4 w-4" /> {tc("signOut")}
            </button>
          </div>
        </div>
      </header>
      <CommandPalette open={palette} onClose={() => setPalette(false)} scope="super" />
      <Drawer open={drawer} onClose={() => setDrawer(false)} title={tc("notifications")}>
        <div className="flex justify-end mb-3">
          <button onClick={markAllRead} className="text-xs font-semibold text-primary hover:underline">{tn("markAllRead")}</button>
        </div>
        <ul className="space-y-2">
          {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">{tn("none")}</p>}
          {items.map(n => (
            <li key={n.id} className={`rounded-xl p-3 ${n.read ? "bg-muted/30" : "bg-card border border-border/60"}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-primary text-sm">{n.title}</p>
                <Badge tone={(n.tone || "default") as never}>{n.tone || "info"}</Badge>
              </div>
              {n.body && <p className="text-xs text-muted-foreground mt-1">{n.body}</p>}
              <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(n.ts, { addSuffix: true })}</p>
            </li>
          ))}
        </ul>
      </Drawer>
    </>
  );
};

export const SuperLayout = ({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <NotificationProvider>
      <div className="min-h-screen flex bg-gradient-hero">
        <div className="hidden lg:block"><SuperSidebar /></div>
        {open && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
            <div className="relative"><SuperSidebar onNavigate={() => setOpen(false)} /></div>
          </div>
        )}
        <div className="flex-1 flex flex-col min-w-0">
          <TopbarInner title={title} subtitle={subtitle} onMenu={() => setOpen(v => !v)} menuOpen={open} />
          <main className="flex-1 p-4 lg:p-8 min-w-0">{children}</main>
        </div>
      </div>
    </NotificationProvider>
  );
};

export default SuperLayout;

