"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { NavLink } from "@/components/NavLink";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  FlaskConical,
  Microscope,
  FileText,
  BookOpen,
  Boxes,
  Cpu,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  Search,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Layers,
  Bug,
  Flame,
  Receipt,
  BarChart3,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useSession, displayName } from "@/lib/auth/useSession";
import { Avatar } from "@/components/common/Avatar";
import { useRoleLabel } from "@/i18n/useRoleLabel";
import LanguageSwitcher from "@/components/site/LanguageSwitcher";
import { HeaderClock } from "@/components/common/HeaderClock";
import { BRAND_INFO } from "@/constants/brand";
import { useSidebarScroll } from "@/hooks/useSidebarScroll";

export const labNav = [
  { to: "/lab/dashboard", icon: LayoutDashboard, label: "Dashboard", group: "overview" },
  { to: "/lab/billing", icon: Receipt, label: "Billing & Cash Desk", group: "overview" },
  { to: "/lab/queue", icon: Users, label: "Phlebotomy Queue", group: "operations" },
  { to: "/lab/orders", icon: ClipboardList, label: "Orders & Worklist", group: "operations" },
  { to: "/lab/samples", icon: FlaskConical, label: "Phlebotomy & Samples", group: "operations" },
  { to: "/lab/results", icon: Microscope, label: "Results Entry & Review", group: "operations" },
  { to: "/lab/batch", icon: Layers, label: "Batch Workstation", group: "operations" },
  { to: "/lab/microbiology", icon: Bug, label: "Microbiology & AST", group: "operations" },
  { to: "/lab/critical", icon: Flame, label: "Critical Value Alerts", group: "operations" },
  { to: "/lab/reports", icon: FileText, label: "Diagnostic Reports", group: "operations" },
  { to: "/lab/tests", icon: BookOpen, label: "Test Directory & Tariffs", group: "resources" },
  { to: "/lab/inventory", icon: Boxes, label: "Reagents & Stock", group: "resources" },
  { to: "/lab/analyzers", icon: Cpu, label: "Instruments & QC", group: "resources" },
  { to: "/lab/analytics", icon: BarChart3, label: "TAT & Analytics", group: "analytics" },
  { to: "/lab/settings", icon: Settings, label: "Lab Configuration", group: "configuration" },
] as const;

const GROUP_TITLES: Record<string, string> = {
  overview: "OVERVIEW",
  operations: "DIAGNOSTIC OPERATIONS",
  resources: "LABORATORY RESOURCES",
  analytics: "QUALITY & ANALYTICS",
  configuration: "MANAGEMENT",
};

const groupedNav = labNav.reduce<Record<string, (typeof labNav)[number][]>>((acc, item) => {
  (acc[item.group] ||= []).push(item);
  return acc;
}, {});

export const LabSidebar = ({ onNavigate, hospital }: { onNavigate?: () => void; hospital?: string }) => {
  const navRef = useSidebarScroll<HTMLElement>("lab");
  return (
    <aside className="w-64 bg-chip/40 border-r border-border/50 flex flex-col py-6 sticky top-0 h-screen shrink-0 overflow-hidden">
      <Link href="/lab/dashboard" className="px-6 flex items-center gap-2">
        <img src={BRAND_INFO.logoMark} alt={`${BRAND_INFO.name} logo`} className="h-8 w-auto shrink-0" />
        <div>
          <div className="font-display text-xl text-primary font-bold">{BRAND_INFO.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] tracking-widest font-semibold text-emerald-600 dark:text-emerald-400">
              LIMS PANEL
            </p>
          </div>
          {hospital && (
            <p className="mt-2 text-[11px] font-bold text-primary truncate" title={hospital}>
              {hospital}
            </p>
          )}
        </div>
      </Link>

      <nav ref={navRef} className="mt-7 px-3 flex-1 flex flex-col gap-4 overflow-y-auto">
        {Object.entries(groupedNav).map(([group, items]) => (
          <div key={group}>
            <p className="px-3 mb-1.5 text-[10px] tracking-widest font-bold text-muted-foreground/70">
              {GROUP_TITLES[group] ?? group.toUpperCase()}
            </p>
            <div className="flex flex-col gap-0.5">
              {items.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20 shadow-soft"
                        : "text-foreground/70 hover:bg-card/60 hover:text-foreground"
                    }`
                  }
                >
                  <l.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{l.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Quick LIMS Status Pill */}
      <div className="px-4 py-2 mx-3 mb-2 rounded-xl bg-card border border-border/60 text-xs">
        <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
          <span>Analyzers Online</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">4 / 4</span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5 mt-1.5 overflow-hidden">
          <div className="bg-emerald-500 h-1.5 rounded-full w-full" />
        </div>
      </div>

      <div className="px-6 text-[10px] tracking-widest font-semibold text-muted-foreground">
        {BRAND_INFO.copyrightUppercase}
      </div>
    </aside>
  );
};

export const LabLayout = ({
  children,
  title = "Laboratory Management",
  subtitle,
  actions,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}) => {
  const router = useRouter();
  const tc = useTranslations("common");
  const roleLabel = useRoleLabel();
  const { user, signOut } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hospitalInfo, setHospitalInfo] = useState<{ name: string; logo?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/v1/hospital/profile");
        const body = await res.json();
        if (!cancelled && res.ok && body.data) {
          setHospitalInfo({ name: body.data.name ?? "Central Hospital Lab", logo: body.data.logo_url });
        }
      } catch {
        // Fallback default
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <LabSidebar hospital={hospitalInfo?.name} />
      </div>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <div className="relative z-10 w-72 bg-card border-r border-border shadow-2xl h-full flex flex-col">
            <div className="p-4 flex items-center justify-between border-b border-border/50">
              <div className="font-display font-bold text-lg text-primary">LIMS Navigation</div>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <LabSidebar onNavigate={() => setMenuOpen(false)} hospital={hospitalInfo?.name} />
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Header */}
        <header className="bg-card/90 backdrop-blur-md border-b border-border/60 sticky top-0 z-30 print:hidden">
          <div className="flex items-center justify-between gap-4 px-4 lg:px-8 py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <button
                className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-muted text-foreground/80"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Toggle Menu"
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-xl lg:text-2xl text-primary font-bold truncate">
                    {title}
                  </h1>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                    LIMS v2.4
                  </span>
                </div>
                {subtitle && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 lg:gap-4">
              {actions && <div className="hidden sm:flex items-center gap-2">{actions}</div>}

              <HeaderClock />
              <LanguageSwitcher compact />

              {/* User profile dropdown / pill */}
              <div className="flex items-center gap-3 border-l border-border/60 pl-3 lg:pl-4">
                <div className="hidden sm:block text-right">
                  <p className="font-semibold text-sm text-primary leading-tight truncate max-w-[160px]">
                    {displayName(user) || "Lab Officer"}
                  </p>
                  <p className="text-[10px] tracking-wider font-bold text-emerald-600 dark:text-emerald-400">
                    LABORATORY ADMIN
                  </p>
                </div>
                <Avatar
                  src={hospitalInfo?.logo || user?.avatarUrl}
                  name={displayName(user) || "L"}
                  className="h-9 w-9 border border-border/60"
                />
              </div>

              <button
                onClick={async () => {
                  await signOut();
                  toast.success(tc("signedOut"));
                  router.replace("/signin");
                  router.refresh();
                }}
                className="p-2 rounded-lg text-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                title={tc("signOut")}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
          {actions && <div className="sm:hidden px-4 pb-3 flex items-center gap-2">{actions}</div>}
        </header>

        {/* Content View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
};
