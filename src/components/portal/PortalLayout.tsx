"use client";

import Link from "next/link";
import { NavLink } from "@/components/NavLink";
import { useRouter } from "next/navigation";
import { LayoutGrid, Users, BookUser, Calendar, LogOut, Bell, Settings, BookOpen, BookText, MessagesSquare } from "lucide-react";
import { toast } from "sonner";
import LanguageSwitcher from "@/components/site/LanguageSwitcher";
import { HeaderClock } from "@/components/common/HeaderClock";
const doctorAvatar = "/assets/doctor-avatar.jpg";
const patientEleanor = "/assets/patient-eleanor.jpg";

const links = [
  { to: "/portal/prescription", icon: LayoutGrid, label: "Prescription" },
  { to: "/portal/queue", icon: Users, label: "Patient Queue" },
  { to: "/portal/directory", icon: BookUser, label: "Patient Directory" },
  { to: "/portal/schedule", icon: Calendar, label: "Schedule" },
  { to: "/portal/community", icon: MessagesSquare, label: "Community" },
  { to: "/portal/user-guide", icon: BookOpen, label: "User Guide" },
  { to: "/portal/medical-dictionary", icon: BookText, label: "Medical Dictionary" },
];

export const PortalSidebar = () => (
  <aside className="w-64 bg-chip/40 border-r border-border/50 flex flex-col py-6 sticky top-0 h-screen">
    <Link href="/" className="px-6 flex items-center gap-2">
      <img src="/favicon.png" alt="HealthFlow logo" className="h-12 w-12 object-contain" />
      <div>
        <div className="font-display text-xl text-primary font-bold">HealthFlow</div>
        <p className="text-[10px] tracking-widest font-semibold text-primary-glow mt-0.5">DOCTOR PORTAL</p>
      </div>
    </Link>

    <div className="px-6 mt-10 flex items-center gap-3">
      <img src={doctorAvatar} alt="Doctor" loading="lazy" width={48} height={48} className="h-12 w-12 rounded-full object-cover" />
      <div>
        <p className="font-display text-lg text-primary leading-tight">Dr. Jhon</p>
        <p className="text-[11px] text-muted-foreground">Internal Medicine</p>
      </div>
    </div>

    <nav className="mt-8 px-3 flex-1 flex flex-col gap-1">
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

export const PortalTopbar = () => {
  const router = useRouter();
  return (
    <header className="bg-card border-b border-border/50">
      <div className="flex items-center justify-between px-8 py-4">
        <div />
        <div className="flex items-center gap-5">
          <HeaderClock />
          <LanguageSwitcher compact />
          <button className="text-foreground/70 hover:text-primary"><Bell className="h-5 w-5" /></button>
          <button className="text-foreground/70 hover:text-primary"><Settings className="h-5 w-5" /></button>
          <div className="flex items-center gap-3 border-l border-border/60 pl-5">
            <div className="text-right">
              <p className="font-semibold text-sm text-primary leading-tight">Elena Verdant</p>
              <p className="text-[10px] tracking-widest font-bold text-primary-glow">PREMIUM PATIENT</p>
            </div>
            <img src={patientEleanor} alt="user" loading="lazy" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
          </div>
          <button onClick={() => { toast.success("Signed out"); router.push("/signin"); }}
            className="flex items-center gap-2 text-sm font-semibold text-foreground/70 hover:text-destructive">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </div>
    </header>
  );
};

export const PortalLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex bg-gradient-hero">
    <PortalSidebar />
    <div className="flex-1 flex flex-col min-w-0">
      <PortalTopbar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  </div>
);

