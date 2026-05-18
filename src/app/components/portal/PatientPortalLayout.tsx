import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid, Calendar, Users, CreditCard, FileText, User, LogOut, Bell, Settings } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { NavLink } from "@/components/NavLink";
import LanguageSwitcher from "@/components/site/LanguageSwitcher";
import { HeaderClock } from "@/components/common/HeaderClock";
import patientEleanor from "@/assets/patient-eleanor.jpg";

export const PatientSidebar = () => {
  const { t } = useTranslation();
  const links = [
    { to: "/patient/dashboard", icon: LayoutGrid, label: t("sidebar.dashboard") },
    { to: "/patient/appointments", icon: Calendar, label: t("sidebar.appointments") },
    { to: "/patient/find-doctors", icon: Users, label: t("sidebar.findDoctors") },
    { to: "/patient/billing", icon: CreditCard, label: t("sidebar.billing") },
    { to: "/patient/medical-records", icon: FileText, label: t("sidebar.medicalRecords") },
    { to: "/patient/profile", icon: User, label: t("sidebar.myProfile") },
  ];
  return (
    <aside className="w-64 bg-chip/40 border-r border-border/50 flex flex-col py-6 sticky top-0 h-screen shrink-0">
      <Link href="/" className="px-6 flex items-center gap-2">
        <img src="/favicon.png" alt="HealthFlow logo" className="h-12 w-12 object-contain" />
        <div>
          <div className="font-display text-xl text-primary font-bold">HealthFlow</div>
          <p className="text-[10px] tracking-widest font-semibold text-primary-glow mt-0.5">{t("sidebar.patientPortal")}</p>
        </div>
      </Link>

      <nav className="mt-10 px-3 flex-1 flex flex-col gap-1">
        {links.map(l => (
          <NavLink key={l.to} to={l.to}
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive ? "bg-card text-primary shadow-soft" : "text-foreground/70 hover:bg-card/60"}`}>
            <l.icon className="h-4 w-4" /> {l.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 text-[10px] tracking-widest font-semibold text-muted-foreground">© 2026 HEALTHFLOW</div>
    </aside>
  );
};

export const PatientTopbar = () => {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <header className="bg-card border-b border-border/50">
      <div className="flex items-center justify-between px-8 py-4">
        <div />
        <div className="flex items-center gap-5">
          <HeaderClock />
          <LanguageSwitcher compact />
          <button className="text-foreground/70 hover:text-primary"><Bell className="h-5 w-5" /></button>
          <button className="text-foreground/70 hover:text-primary"><Settings className="h-5 w-5" /></button>
          <NavLink to="/patient/profile" className={({ isActive }) => `text-foreground/70 hover:text-primary transition ${isActive ? "text-primary" : ""}`}>
            <User className="h-5 w-5" />
          </NavLink>
          <div className="flex items-center gap-3 border-l border-border/60 pl-5">
            <div className="text-right">
              <p className="font-semibold text-sm text-primary leading-tight">Elena Verdant</p>
              <p className="text-[10px] tracking-widest font-bold text-primary-glow">PREMIUM PATIENT</p>
            </div>
            <img src={patientEleanor} alt="user" loading="lazy" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
          </div>
          <button onClick={() => { toast.success("Signed out"); router.push("/signin"); }}
            className="flex items-center gap-2 text-sm font-semibold text-foreground/70 hover:text-destructive">
            <LogOut className="h-4 w-4" /> {t("sidebar.signOut")}
          </button>
        </div>
      </div>
    </header>
  );
};

export const PatientPortalLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex bg-gradient-hero">
    <PatientSidebar />
    <div className="flex-1 flex flex-col min-w-0">
      <PatientTopbar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  </div>
);
