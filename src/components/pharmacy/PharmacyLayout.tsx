"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, ShoppingCart, History, Calculator, Package, Boxes, AlertTriangle, ClipboardList,
  Truck, Receipt, FileBarChart, Users, Lightbulb, Settings, LogOut, Menu, X, ArrowLeft,
  UserCog, Building2, ScrollText, Lock, Bell, Command as CommandIcon, Sparkles, Bot, SlidersHorizontal, type LucideIcon,
} from "lucide-react";
import { CommandBar } from "@/components/pharmacy/CommandBar";
import { usePharmacyAlerts } from "@/components/pharmacy/useAlerts";
import type { Permission, PharmacyMe } from "@/lib/pharmacy";
import { usePharmacyMeQuery } from "@/redux/api/pharmacy";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { NavLink } from "@/components/NavLink";
import { useSession, displayName } from "@/lib/auth/useSession";
import { Avatar } from "@/components/common/Avatar";
import { useRoleLabel } from "@/i18n/useRoleLabel";
import LanguageSwitcher from "@/components/site/LanguageSwitcher";
import { HeaderClock } from "@/components/common/HeaderClock";
import { BRAND_INFO } from "@/constants/brand";
import { useSidebarScroll } from "@/hooks/useSidebarScroll";

/**
 * The pharmacy panel's menu. `key` names the label in the "pharmacyNav"
 * messages and `group` names its heading there, the same way adminNav does.
 */
type NavGroup = "overview" | "sell" | "stock" | "buying" | "money" | "ai" | "administration";
type NavKey =
  | "dashboard" | "pos" | "sales" | "cashDrawer" | "products" | "stock" | "stockAlerts" | "purchases" | "suppliers"
  | "expenses" | "reports" | "customers" | "insights" | "staff" | "branches" | "audit" | "settings" | "notifications"
  | "ai" | "aiAssistant" | "aiSettings";

/**
 * `needs` is the permission (0133) a login must hold to be shown the link.
 * Hiding a link is a courtesy: the database refuses the work behind it anyway.
 */
type NavItem = { to: string; icon: LucideIcon; key: NavKey; group: NavGroup; needs?: Permission };

export const pharmacyNav: NavItem[] = [
  { to: "/pharmacy/dashboard", icon: LayoutDashboard, key: "dashboard", group: "overview" },
  { to: "/pharmacy/notifications", icon: Bell, key: "notifications", group: "overview" },
  { to: "/pharmacy/pos", icon: ShoppingCart, key: "pos", group: "sell" },
  { to: "/pharmacy/sales", icon: History, key: "sales", group: "sell" },
  { to: "/pharmacy/cash-drawer", icon: Calculator, key: "cashDrawer", group: "sell" },
  { to: "/pharmacy/customers", icon: Users, key: "customers", group: "sell" },
  { to: "/pharmacy/products", icon: Package, key: "products", group: "stock" },
  { to: "/pharmacy/stock", icon: Boxes, key: "stock", group: "stock" },
  { to: "/pharmacy/stock-alerts", icon: AlertTriangle, key: "stockAlerts", group: "stock" },
  { to: "/pharmacy/purchases", icon: ClipboardList, key: "purchases", group: "buying", needs: "manage_stock" },
  { to: "/pharmacy/suppliers", icon: Truck, key: "suppliers", group: "buying", needs: "manage_stock" },
  { to: "/pharmacy/expenses", icon: Receipt, key: "expenses", group: "money", needs: "see_reports" },
  { to: "/pharmacy/reports", icon: FileBarChart, key: "reports", group: "money", needs: "see_reports" },
  { to: "/pharmacy/insights", icon: Lightbulb, key: "insights", group: "money", needs: "see_reports" },
  { to: "/pharmacy/ai", icon: Sparkles, key: "ai", group: "ai" },
  { to: "/pharmacy/ai-assistant", icon: Bot, key: "aiAssistant", group: "ai", needs: "see_reports" },
  { to: "/pharmacy/ai-settings", icon: SlidersHorizontal, key: "aiSettings", group: "ai", needs: "administer" },
  { to: "/pharmacy/staff", icon: UserCog, key: "staff", group: "administration", needs: "administer" },
  { to: "/pharmacy/branches", icon: Building2, key: "branches", group: "administration", needs: "administer" },
  { to: "/pharmacy/audit", icon: ScrollText, key: "audit", group: "administration", needs: "administer" },
  { to: "/pharmacy/settings", icon: Settings, key: "settings", group: "administration", needs: "administer" },
];

const PharmacySidebar = ({ onNavigate, isAdmin, me }: { onNavigate?: () => void; isAdmin: boolean; me?: PharmacyMe }) => {
  const t = useTranslations("pharmacyNav");
  const navRef = useSidebarScroll<HTMLElement>("pharmacy");

  // Until the answer is in, only the links everyone has: a menu that grows is
  // kinder than one that shows a link and takes it away.
  const groupedNav = pharmacyNav
    .filter(item => !item.needs || me?.can[item.needs])
    .reduce<Partial<Record<NavGroup, NavItem[]>>>((acc, item) => {
      (acc[item.group] ||= []).push(item);
      return acc;
    }, {});
  return (
    <aside className="w-64 bg-chip/40 border-r border-border/50 flex flex-col py-6 sticky top-0 h-screen shrink-0 overflow-hidden">
      <Link href="/pharmacy/dashboard" className="px-6 flex items-center gap-2">
        <img src={BRAND_INFO.logoMark} alt={`${BRAND_INFO.name} logo`} className="h-8 w-auto shrink-0" />
        <div>
          <div className="font-display text-xl text-primary font-bold">{BRAND_INFO.name}</div>
          <p className="text-[10px] tracking-widest font-semibold text-primary-glow mt-0.5">{t("panel")}</p>
        </div>
      </Link>
      <nav ref={navRef} className="mt-8 px-3 flex-1 flex flex-col gap-4 overflow-y-auto">
        {(Object.entries(groupedNav) as [NavGroup, NavItem[]][]).map(([group, items]) => (
          <div key={group}>
            <p className="px-3 mb-1.5 text-[10px] tracking-widest font-bold text-muted-foreground/70">
              {t(`groups.${group}`).toUpperCase()}
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
      {/* The hospital admin came here from their own panel, and goes back to it. */}
      {isAdmin && (
        <Link href="/admin/dashboard" onClick={onNavigate}
          className="mx-3 mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-foreground/70 hover:bg-card/60">
          <ArrowLeft className="h-4 w-4" /> {t("backToAdmin")}
        </Link>
      )}
      <div className="px-6 pt-4 text-[10px] tracking-widest font-semibold text-muted-foreground">{BRAND_INFO.copyrightUppercase}</div>
    </aside>
  );
};

export const PharmacyLayout = ({ children, title, subtitle, actions, needs }: {
  children: ReactNode; title: string; subtitle?: string;
  /** Buttons that belong to the page as a whole, drawn at the right of the top bar. */
  actions?: ReactNode;
  /** The permission this whole screen is for. Without it the page says so, where it would otherwise show a row of errors. */
  needs?: Permission;
}) => {
  const t = useTranslations("pharmacyNav");
  const tc = useTranslations("common");
  const roleLabel = useRoleLabel();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { user, isLoading, signOut } = useSession();
  const { data: meData } = usePharmacyMeQuery(undefined, { skip: !user });
  const me = meData?.data;
  const [commanding, setCommanding] = useState(false);
  const { unreadCount } = usePharmacyAlerts();

  // src/proxy.ts already keeps this panel to pharmacy staff. This only covers
  // a session that expires while the tab is open.
  useEffect(() => {
    if (!isLoading && !user) {
      toast.error(t("signInRequired"));
      router.replace("/signin");
    }
  }, [isLoading, user, router, t]);

  if (isLoading || !user) return null;

  const isAdmin = user.role === "hospital_admin";
  // A pharmacy login is a manager, a pharmacist, a cashier or a stock keeper; say which.
  const role = me?.staff_role && !isAdmin ? t(`staffRoles.${me.staff_role}`) : roleLabel(user.role);
  const refused = Boolean(needs && me && !me.can[needs]);

  return (
    // print: only the page's own content goes to paper.
    <div className="min-h-screen flex bg-gradient-hero print:block print:min-h-0 print:bg-white">
      <CommandBar open={commanding} onOpenChange={setCommanding}
        entries={pharmacyNav.filter(item => !item.needs || me?.can[item.needs])
          .map(item => ({ to: item.to, icon: item.icon, label: t(`links.${item.key}`), group: t(`groups.${item.group}`) }))} />
      <div className="hidden lg:block print:!hidden"><PharmacySidebar isAdmin={isAdmin} me={me} /></div>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative"><PharmacySidebar isAdmin={isAdmin} me={me} onNavigate={() => setOpen(false)} /></div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-card border-b border-border/50 sticky top-0 z-30 print:hidden">
          <div className="flex items-center justify-between gap-4 px-4 lg:px-8 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <button className="lg:hidden p-2 -ml-2" onClick={() => setOpen(v => !v)}>
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div className="min-w-0">
                <h1 className="font-display text-2xl text-primary truncate">{title}</h1>
                {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3 lg:gap-5">
              {actions}
              <button type="button" onClick={() => setCommanding(true)} title={t("commandHint")} aria-label={t("commandHint")}
                className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-2 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-primary hover:border-primary/50">
                <CommandIcon className="h-3.5 w-3.5" /> <span className="font-mono">Ctrl ⇧ K</span>
              </button>
              <Link href="/pharmacy/notifications" title={t("links.notifications")} aria-label={t("links.notifications")}
                className="relative p-2 rounded-lg text-foreground/70 hover:text-primary hover:bg-muted">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 grid min-w-[18px] h-[18px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
              <HeaderClock />
              <LanguageSwitcher compact />
              {/* Their own name is the way in to their own profile. */}
              <Link href="/pharmacy/profile" title={t("profile")} className="hidden sm:flex items-center gap-3 border-l border-border/60 pl-5 hover:opacity-80">
                <div className="text-right">
                  <p className="font-semibold text-sm text-primary leading-tight truncate max-w-[180px]">{displayName(user)}</p>
                  <p className="text-[10px] tracking-widest font-bold text-primary-glow">{role.toUpperCase()}</p>
                </div>
                <Avatar src={user.avatarUrl} name={displayName(user)} />
              </Link>
              <button onClick={async () => { await signOut(); toast.success(tc("signedOut")); router.replace("/signin"); router.refresh(); }}
                className="hidden md:flex items-center gap-2 text-sm font-semibold text-foreground/70 hover:text-destructive">
                <LogOut className="h-4 w-4" /> {tc("signOut")}
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8 min-w-0 print:p-0">
          {refused ? (
            <div className="max-w-md mx-auto mt-16 rounded-2xl bg-card border border-border/60 p-8 text-center shadow-soft">
              <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="font-display text-xl text-primary mt-3">{t("noAccessTitle")}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("noAccessBody")}</p>
            </div>
          ) : children}
        </main>
      </div>
    </div>
  );
};

export default PharmacyLayout;
