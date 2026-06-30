import { ReactNode, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Stethoscope, UserCog, HeartPulse, Wrench, BedDouble, FlaskConical,
  Building2, FileBarChart, Users2, Wallet, FolderLock, CalendarCheck2, Boxes,
  ClipboardList, ShieldCheck, Pill, Settings, LogOut, Bell, Menu, X,
  Truck, UserPlus, CalendarDays, BellRing, BookOpen, Calculator,
} from "lucide-react";
import { toast } from "sonner";
import { NotificationProvider, useNotifications } from "./NotificationProvider";
import { CommandPalette } from "./CommandPalette";
import { Drawer } from "./crud";
import { Pill as Badge } from "./ui";
import { getRole, setRole, type Role } from "@/lib/rbac";
import { getSession, clearSession } from "@/lib/tenants";
import { formatDistanceToNow } from "date-fns";
import { NavLink } from "@/components/NavLink";
import LanguageSwitcher from "@/components/site/LanguageSwitcher";
import { HeaderClock } from "@/components/common/HeaderClock";

export const adminNav = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard", group: "Overview" },
  { to: "/admin/doctors", icon: Stethoscope, label: "Doctors", group: "Clinical" },
  { to: "/admin/doctor-assistants", icon: UserCog, label: "Doctor Assistants", group: "Clinical" },
  { to: "/admin/nurses", icon: HeartPulse, label: "Nurses", group: "Clinical" },
  { to: "/admin/support-staff", icon: Wrench, label: "Support Staff", group: "Clinical" },
  { to: "/admin/patients", icon: UserPlus, label: "Patients", group: "Clinical" },
  { to: "/admin/appointments", icon: CalendarDays, label: "Appointments", group: "Clinical" },
  { to: "/admin/wards", icon: BedDouble, label: "Wards & Beds", group: "Operations" },
  { to: "/admin/admissions", icon: UserPlus, label: "Admissions", group: "Operations" },
  { to: "/admin/lab", icon: FlaskConical, label: "Laboratory", group: "Operations" },
  { to: "/admin/pharmacy", icon: Pill, label: "Pharmacy", group: "Operations" },
  { to: "/admin/hospital-profile", icon: Building2, label: "Hospital Profile", group: "Operations" },
  { to: "/admin/hr", icon: Users2, label: "HR Dashboard", group: "HR & Administration" },
  { to: "/admin/onboarding", icon: UserPlus, label: "Employees", group: "HR & Administration" },
  { to: "/admin/personal-files", icon: FolderLock, label: "Personal Files", group: "HR & Administration" },
  { to: "/admin/attendance", icon: CalendarCheck2, label: "Attendance & Leave", group: "HR & Administration" },
  { to: "/admin/accounts", icon: BookOpen, label: "Accounts (Tally)", group: "Accounts & Finance" },
  { to: "/admin/finance", icon: Calculator, label: "Invoices & AR/AP", group: "Accounts & Finance" },
  { to: "/admin/payroll", icon: Wallet, label: "Payroll", group: "HR & Administration" },
  { to: "/admin/reports", icon: FileBarChart, label: "Financial Reports", group: "Accounts & Finance" },
  { to: "/admin/assets", icon: Boxes, label: "Assets", group: "Business" },
  { to: "/admin/procurement", icon: ClipboardList, label: "Procurement", group: "Business" },
  { to: "/admin/vendors", icon: Truck, label: "Vendors", group: "Business" },
  { to: "/admin/reports", icon: FileBarChart, label: "Reports", group: "Business" },
  { to: "/admin/notifications", icon: BellRing, label: "Notifications", group: "System" },
  { to: "/admin/administration", icon: ShieldCheck, label: "Administration", group: "System" },
  { to: "/admin/settings", icon: Settings, label: "Settings", group: "System" },
];

const groupedNav = adminNav.reduce<Record<string, typeof adminNav>>((acc, item) => {
  (acc[item.group] ||= []).push(item);
  return acc;
}, {});

export const AdminSidebar = ({ onNavigate, hospital }: { onNavigate?: () => void; hospital?: string }) => (
  <aside className="w-64 bg-chip/40 border-r border-border/50 flex flex-col py-6 sticky top-0 h-screen shrink-0 overflow-hidden">
    <Link href="/" className="px-6 flex items-center gap-2">
      <Image src="/favicon.png" alt="HealthFlow logo" width={48} height={48} className="h-12 w-12 object-contain" />
      <div>
      <div className="font-display text-xl text-primary font-bold">HealthFlow</div>
      <p className="text-[10px] tracking-widest font-semibold text-primary-glow mt-0.5">HOSPITAL ADMIN</p>
      {hospital && (
        <p className="mt-3 text-[11px] font-bold text-primary truncate" title={hospital}>{hospital}</p>
      )}
      </div>
    </Link>
    <nav className="mt-8 px-3 flex-1 flex flex-col gap-4 overflow-y-auto">
      {Object.entries(groupedNav).map(([group, items]) => (
        <div key={group}>
          <p className="px-3 mb-1.5 text-[10px] tracking-widest font-bold text-muted-foreground/70">{group.toUpperCase()}</p>
          <div className="flex flex-col gap-0.5">
            {items.map(l => (
              <NavLink key={l.to} to={l.to} onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                    isActive ? "bg-card text-primary shadow-soft" : "text-foreground/70 hover:bg-card/60"
                  }`
                }>
                <l.icon className="h-4 w-4 shrink-0" /> <span className="truncate">{l.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
    <div className="px-6 pt-4 text-[10px] tracking-widest font-semibold text-muted-foreground">© 2026 HEALTHFLOW</div>
  </aside>
);

const ROLES: { v: Role; l: string }[] = [
  { v: "hospital_admin", l: "Hospital Admin" },
  { v: "hr_admin", l: "HR Admin" },
  { v: "finance_admin", l: "Finance Admin" },
  { v: "lab_admin", l: "Lab Admin" },
  { v: "pharmacy_admin", l: "Pharmacy Admin" },
];

const TopbarInner = ({ title, subtitle, onMenu, menuOpen, hospital }: { title: string; subtitle?: string; onMenu: () => void; menuOpen: boolean; hospital?: string }) => {
  const router = useRouter();
  const { items, unread, markAllRead } = useNotifications();
  const [palette, setPalette] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [role, setR] = useState<Role>(getRole());
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
              {(subtitle || hospital) && <p className="text-xs text-muted-foreground truncate">{hospital ? `${hospital}${subtitle ? ` · ${subtitle}` : ""}` : subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3 lg:gap-5">
            <HeaderClock />
            <LanguageSwitcher compact />
            <select value={role} onChange={e => { const v = e.target.value as Role; setRole(v); setR(v); toast.info(`Viewing as ${v}`); }}
              className="hidden lg:block bg-muted/40 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none">
              {ROLES.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
            </select>
            <button onClick={() => setDrawer(true)} className="relative text-foreground/70 hover:text-primary">
              <Bell className="h-5 w-5" />
              {unread > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold grid place-items-center">{unread}</span>}
            </button>
            <div className="hidden sm:flex items-center gap-3 border-l border-border/60 pl-5">
              <div className="text-right">
                <p className="font-semibold text-sm text-primary leading-tight truncate max-w-[180px]">{hospital || "Hospital Admin"}</p>
                <p className="text-[10px] tracking-widest font-bold text-primary-glow">{role.replace("_", " ").toUpperCase()}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-gradient-dark grid place-items-center text-surface-dark-foreground text-xs font-bold">
                {(hospital || "HA").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase()}
              </div>
            </div>
            <button onClick={() => { clearSession(); toast.success("Signed out"); router.push("/signin"); }}
              className="hidden md:flex items-center gap-2 text-sm font-semibold text-foreground/70 hover:text-destructive">
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </div>
      </header>
      <CommandPalette open={palette} onClose={() => setPalette(false)} scope="admin" />
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

export const AdminLayout = ({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) => {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [session, setSession] = useState(() => getSession());
  useEffect(() => {
    if (!session) {
      toast.error("Please sign in to access the hospital admin panel.");
      router.replace("/signin");
      return;
    }
    const sync = () => setSession(getSession());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [session, router]);
  if (!session) return null;
  const hospital = session.hospital;
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
