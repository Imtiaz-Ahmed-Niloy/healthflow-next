"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { NavLink } from "@/components/NavLink";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Building2, ShieldCheck, FileBarChart, Package, Globe2, ListChecks,
  FileCode2, Receipt, Settings, LogOut, Bell, Menu, X, Network, Megaphone, LifeBuoy, ScrollText, Workflow,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { NotificationProvider, useNotifications } from "@/components/admin/NotificationProvider";
import { CommandPalette } from "@/components/admin/CommandPalette";
import { Drawer } from "@/components/admin/crud";
import { Pill as Badge } from "@/components/admin/ui";
import { formatDistanceToNow } from "date-fns";
import LanguageSwitcher from "@/components/site/LanguageSwitcher";
import { HeaderClock } from "@/components/common/HeaderClock";

export const superNav = [
  { to: "/super/dashboard", icon: LayoutDashboard, label: "Dashboard", group: "Overview" },
  { to: "/super/hospitals", icon: Building2, label: "Hospital Management", group: "Tenants" },
  { to: "/super/onboarding", icon: Workflow, label: "Onboarding Queue", group: "Tenants" },
  { to: "/super/roles", icon: ShieldCheck, label: "User Role Management", group: "Tenants" },
  { to: "/super/package-management", icon: Package, label: "Package Management", group: "Tenants" },
  { to: "/super/logs", icon: FileBarChart, label: "Log Reports", group: "Monitoring" },
  
  { to: "/super/whitelisting", icon: ListChecks, label: "Whitelisting", group: "Monitoring" },
  
  { to: "/super/billing", icon: Receipt, label: "Billing", group: "Commerce" },
  { to: "/super/cms", icon: FileCode2, label: "CMS Management", group: "Content" },
  { to: "/super/announcements", icon: Megaphone, label: "Announcements", group: "Content" },
  { to: "/super/tickets", icon: LifeBuoy, label: "Support Tickets", group: "System" },
  { to: "/super/integrations", icon: Network, label: "Integrations", group: "System" },
  { to: "/super/global-settings", icon: Globe2, label: "Global Settings", group: "System" },
  { to: "/super/settings", icon: Settings, label: "Preferences", group: "System" },
];

const grouped = superNav.reduce<Record<string, typeof superNav>>((a, i) => {
  (a[i.group] ||= []).push(i); return a;
}, {});

const CMS_SUBLINKS = [
  { to: "/super/cms/home", label: "Home" },
  { to: "/super/cms/features", label: "Features" },
  { to: "/super/cms/pricing", label: "Pricing" },
  { to: "/super/cms/about", label: "About Us" },
  { to: "/super/cms/contact", label: "Contact" },
  { to: "/super/cms/blog", label: "Blog" },
];

export const SuperSidebar = ({ onNavigate }: { onNavigate?: () => void }) => {
  const pathname = usePathname();
  const cmsActive = pathname.startsWith("/super/cms");
  const [cmsOpen, setCmsOpen] = useState(cmsActive);
  useEffect(() => { if (cmsActive) setCmsOpen(true); }, [cmsActive]);

  return (
  <aside className="w-64 bg-chip/40 border-r border-border/50 flex flex-col py-6 sticky top-0 h-screen shrink-0 overflow-hidden">
    <Link href="/" className="px-6 flex items-center gap-2">
      <img src="/favicon.png" alt="HealthFlow logo" className="h-12 w-12 object-contain" />
      <div>
        <div className="font-display text-xl text-primary font-bold">HealthFlow</div>
        <p className="text-[10px] tracking-widest font-semibold text-primary-glow mt-0.5">SUPER ADMIN</p>
      </div>
    </Link>
    <nav className="mt-8 px-3 flex-1 flex flex-col gap-4 overflow-y-auto">
      {Object.entries(grouped).map(([g, items]) => (
        <div key={g}>
          <p className="px-3 mb-1.5 text-[10px] tracking-widest font-bold text-muted-foreground/70">{g.toUpperCase()}</p>
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
                      <span className="truncate flex-1 text-left">{l.label}</span>
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
                          Overview
                        </NavLink>
                        {CMS_SUBLINKS.map(s => (
                          <NavLink key={s.to} to={s.to} onClick={onNavigate}
                            className={({ isActive }) =>
                              `px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                                isActive ? "bg-card text-primary" : "text-foreground/60 hover:text-primary hover:bg-card/40"
                              }`
                            }>
                            {s.label}
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
                  <l.icon className="h-4 w-4 shrink-0" /> <span className="truncate">{l.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
    <div className="px-6 pt-4 text-[10px] tracking-widest font-semibold text-muted-foreground">© 2026 HEALTHFLOW</div>
  </aside>
  );
};

const TopbarInner = ({ title, subtitle, onMenu, menuOpen }: { title: string; subtitle?: string; onMenu: () => void; menuOpen: boolean }) => {
  const router = useRouter();
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
            <button onClick={() => setDrawer(true)} className="relative text-foreground/70 hover:text-primary">
              <Bell className="h-5 w-5" />
              {unread > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold grid place-items-center">{unread}</span>}
            </button>
            <div className="hidden sm:flex items-center gap-3 border-l border-border/60 pl-5">
              <div className="text-right">
                <p className="font-semibold text-sm text-primary leading-tight">Root Operator</p>
                <p className="text-[10px] tracking-widest font-bold text-primary-glow">SUPER ADMIN</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-gradient-dark grid place-items-center text-surface-dark-foreground text-xs font-bold">RO</div>
            </div>
            <button onClick={() => { toast.success("Signed out"); router.push("/signin"); }}
              className="hidden md:flex items-center gap-2 text-sm font-semibold text-foreground/70 hover:text-destructive">
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </div>
      </header>
      <CommandPalette open={palette} onClose={() => setPalette(false)} scope="super" />
      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Notifications">
        <div className="flex justify-end mb-3">
          <button onClick={markAllRead} className="text-xs font-semibold text-primary hover:underline">Mark all as read</button>
        </div>
        <ul className="space-y-2">
          {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>}
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

