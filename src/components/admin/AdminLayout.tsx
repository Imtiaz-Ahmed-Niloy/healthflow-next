"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { NavLink } from "@/components/NavLink";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Stethoscope, UserCog, HeartPulse, Wrench, BedDouble, FlaskConical,
  Building2, FileBarChart, Users2, Wallet, FolderLock, CalendarCheck2, Boxes,
  ClipboardList, ShieldCheck, Pill, Settings, LogOut, Bell, Menu, X,
  Truck, UserPlus, CalendarDays, BellRing, BookOpen, Calculator,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { NotificationProvider, useNotifications } from "./NotificationProvider";
import { CommandPalette } from "./CommandPalette";
import { Drawer } from "./crud";
import { Pill as Badge } from "./ui";
import { useSession, displayName } from "@/lib/auth/useSession";
import { Avatar } from "@/components/common/Avatar";
import { useRoleLabel } from "@/i18n/useRoleLabel";
import { formatDistanceToNow } from "date-fns";
import LanguageSwitcher from "@/components/site/LanguageSwitcher";
import { HeaderClock } from "@/components/common/HeaderClock";
import { BRAND_INFO } from "@/constants/brand";

/**
 * The admin menu. `key` names the label in the "adminNav" messages and
 * `group` names its heading there, so the menu reads in the admin's own
 * language and the command palette can search the same words.
 */
export const adminNav = [
  { to: "/admin/dashboard", icon: LayoutDashboard, key: "dashboard", group: "overview" },
  { to: "/admin/doctors", icon: Stethoscope, key: "doctors", group: "clinical" },
  { to: "/admin/doctor-assistants", icon: UserCog, key: "doctorAssistants", group: "clinical" },
  { to: "/admin/nurses", icon: HeartPulse, key: "nurses", group: "clinical" },
  { to: "/admin/support-staff", icon: Wrench, key: "supportStaff", group: "clinical" },
  { to: "/admin/patients", icon: UserPlus, key: "patients", group: "clinical" },
  { to: "/admin/appointments", icon: CalendarDays, key: "appointments", group: "clinical" },
  { to: "/admin/wards", icon: BedDouble, key: "wards", group: "operations" },
  { to: "/admin/admissions", icon: UserPlus, key: "admissions", group: "operations" },
  { to: "/admin/lab", icon: FlaskConical, key: "lab", group: "operations" },
  { to: "/admin/pharmacy", icon: Pill, key: "pharmacy", group: "operations" },
  { to: "/admin/hospital-profile", icon: Building2, key: "hospitalProfile", group: "operations" },
  { to: "/admin/hr", icon: Users2, key: "hr", group: "hr" },
  { to: "/admin/onboarding", icon: UserPlus, key: "employees", group: "hr" },
  { to: "/admin/personal-files", icon: FolderLock, key: "personalFiles", group: "hr" },
  { to: "/admin/attendance", icon: CalendarCheck2, key: "attendance", group: "hr" },
  { to: "/admin/accounts", icon: BookOpen, key: "accounts", group: "finance" },
  { to: "/admin/finance", icon: Calculator, key: "finance", group: "finance" },
  { to: "/admin/payroll", icon: Wallet, key: "payroll", group: "hr" },
  { to: "/admin/reports", icon: FileBarChart, key: "financialReports", group: "finance" },
  { to: "/admin/assets", icon: Boxes, key: "assets", group: "business" },
  { to: "/admin/procurement", icon: ClipboardList, key: "procurement", group: "business" },
  { to: "/admin/vendors", icon: Truck, key: "vendors", group: "business" },
  { to: "/admin/reports", icon: FileBarChart, key: "reports", group: "business" },
  { to: "/admin/notifications", icon: BellRing, key: "notifications", group: "system" },
  { to: "/admin/administration", icon: ShieldCheck, key: "administration", group: "system" },
  { to: "/admin/settings", icon: Settings, key: "settings", group: "system" },
] as const;

const groupedNav = adminNav.reduce<Record<string, (typeof adminNav)[number][]>>((acc, item) => {
  (acc[item.group] ||= []).push(item);
  return acc;
}, {});

export const AdminSidebar = ({ onNavigate, hospital }: { onNavigate?: () => void; hospital?: string }) => {
  const t = useTranslations("adminNav");
  return (
    <aside className="w-64 bg-chip/40 border-r border-border/50 flex flex-col py-6 sticky top-0 h-screen shrink-0 overflow-hidden">
      <Link href="/" className="px-6 flex items-center gap-2">
        <img src={BRAND_INFO.logoMark} alt={`${BRAND_INFO.name} logo`} className="h-8 w-auto shrink-0" />
        <div>
        <div className="font-display text-xl text-primary font-bold">{BRAND_INFO.name}</div>
        <p className="text-[10px] tracking-widest font-semibold text-primary-glow mt-0.5">{t("panel")}</p>
        {hospital && (
          <p className="mt-3 text-[11px] font-bold text-primary truncate" title={hospital}>{hospital}</p>
        )}
        </div>
      </Link>
      <nav className="mt-8 px-3 flex-1 flex flex-col gap-4 overflow-y-auto">
        {Object.entries(groupedNav).map(([group, items]) => (
          <div key={group}>
            <p className="px-3 mb-1.5 text-[10px] tracking-widest font-bold text-muted-foreground/70">
              {t(`groups.${group as (typeof adminNav)[number]["group"]}`).toUpperCase()}
            </p>
            <div className="flex flex-col gap-0.5">
              {items.map(l => (
                <NavLink key={l.to} to={l.to} onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                      isActive ? "bg-card text-primary shadow-soft" : "text-foreground/70 hover:bg-card/60"
                    }`
                  }>
                  <l.icon className="h-4 w-4 shrink-0" /> <span className="truncate">{t(`links.${l.key}`)}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-6 pt-4 text-[10px] tracking-widest font-semibold text-muted-foreground">{BRAND_INFO.copyrightUppercase}</div>
    </aside>
  );
};

const TopbarInner = ({ title, subtitle, onMenu, menuOpen, hospital }: { title: string; subtitle?: string; onMenu: () => void; menuOpen: boolean; hospital?: string }) => {
  const tc = useTranslations("common");
  const tn = useTranslations("adminNav");
  const roleLabel = useRoleLabel();
  const router = useRouter();
  const { items, unread, markAllRead } = useNotifications();
  const [palette, setPalette] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const { user, signOut } = useSession();
  const [hospitalLogo, setHospitalLogo] = useState<{ src: string; name: string } | null>(null);

  // The admin's own hospital logo, in place of their initials. Only a
  // hospital_admin gets an answer; everyone else sees 403 here and keeps
  // their own picture.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/v1/hospital/profile");
        const body = await res.json();
        const logo = res.ok ? body.data?.logo_url : null;
        if (!cancelled && logo) setHospitalLogo({ src: logo, name: body.data?.name ?? "Hospital" });
      } catch {
        // No logo is not worth an error in the header.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const f =(e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setPalette(true); } };
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
              {(subtitle || hospital) && <p className="text-xs text-muted-foreground truncate">{hospital ? `${hospital}${subtitle ? ` · ${subtitle}` : ""}` : subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3 lg:gap-5">
            <HeaderClock />
            <LanguageSwitcher compact />
            {/* The role switcher that used to live here let anyone view the
                panel as any role by writing to localStorage. Role now comes
                from the signed-in user's verified token and cannot be picked. */}
            <button onClick={() => setDrawer(true)} aria-label={tc("notifications")} className="relative text-foreground/70 hover:text-primary">
              <Bell className="h-5 w-5" />
              {unread > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold grid place-items-center">{unread}</span>}
            </button>
            <div className="hidden sm:flex items-center gap-3 border-l border-border/60 pl-5">
              <div className="text-right">
                <p className="font-semibold text-sm text-primary leading-tight truncate max-w-[180px]">{displayName(user)}</p>
                <p className="text-[10px] tracking-widest font-bold text-primary-glow">{roleLabel(user?.role).toUpperCase()}</p>
              </div>
              {/* The hospital logo when there is one, contained rather than
                  cropped. Otherwise the person: initials until there is a
                  picture — Avatar decides. */}
              {hospitalLogo
                ? <Avatar src={hospitalLogo.src} name={hospitalLogo.name} className="h-10 w-10 object-contain bg-white border border-border/60 p-0.5" />
                : <Avatar src={user?.avatarUrl} name={displayName(user)} />}
            </div>
            <button onClick={async () => { await signOut(); toast.success(tc("signedOut")); router.replace("/signin"); router.refresh(); }}
              className="hidden md:flex items-center gap-2 text-sm font-semibold text-foreground/70 hover:text-destructive">
              <LogOut className="h-4 w-4" /> {tc("signOut")}
            </button>
          </div>
        </div>
      </header>
      <CommandPalette open={palette} onClose={() => setPalette(false)} scope="admin" />
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

export const AdminLayout = ({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) => {
  const t = useTranslations("adminNav");
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { user, isLoading } = useSession();

  // src/proxy.ts already blocks this route server-side, so by the time
  // anything renders the user is authorised. This only covers the case where
  // a session expires while the tab is open.
  useEffect(() => {
    if (!isLoading && !user) {
      toast.error(t("signInRequired"));
      router.replace("/signin");
    }
  }, [isLoading, user, router, t]);

  if (isLoading || !user) return null;

  // TODO: resolve the hospital name from tenant_id once provisioning lands.
  // Until then the header shows the person, not the hospital.
  const hospital = undefined;
  return (
    <NotificationProvider>
      <div className="min-h-screen flex bg-gradient-hero">
        <div className="hidden lg:block"><AdminSidebar hospital={hospital} /></div>
        {open && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
            <div className="relative"><AdminSidebar hospital={hospital} onNavigate={() => setOpen(false)} /></div>
          </div>
        )}
        <div className="flex-1 flex flex-col min-w-0">
          <TopbarInner title={title} subtitle={subtitle} hospital={hospital} onMenu={() => setOpen(v => !v)} menuOpen={open} />
          <main className="flex-1 p-4 lg:p-8 min-w-0">{children}</main>
        </div>
      </div>
    </NotificationProvider>
  );
};

export default AdminLayout;

