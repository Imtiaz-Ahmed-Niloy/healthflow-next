"use client";

import Link from "next/link";
import { NavLink } from "@/components/NavLink";
import { useRouter } from "next/navigation";
import { LayoutGrid, Users, BookUser, Calendar, LogOut, Bell, Settings, BookOpen, MessagesSquare } from "lucide-react";
import { toast } from "sonner";
import LanguageSwitcher from "@/components/site/LanguageSwitcher";
import { HeaderClock } from "@/components/common/HeaderClock";
import { useSession, displayName } from "@/lib/auth/useSession";
import { roleLabel } from "@/lib/auth/permissions";
import { BRAND_INFO } from "@/constants/brand";
import { Avatar } from "@/components/common/Avatar";

/**
 * Medical Dictionary is deliberately absent.
 *
 * /portal/medical-dictionary is built and still routes — it is a static
 * glossary of 25 terms with search and category filtering — but it is off the
 * menu for now. The page and its route are left in place rather than deleted,
 * so putting it back is one line here.
 */
const links = [
  { to: "/portal/prescription", icon: LayoutGrid, label: "Prescription" },
  { to: "/portal/queue", icon: Users, label: "Patient Queue" },
  { to: "/portal/directory", icon: BookUser, label: "Patient Directory" },
  { to: "/portal/schedule", icon: Calendar, label: "Schedule" },
  { to: "/portal/community", icon: MessagesSquare, label: "Community" },
  { to: "/portal/user-guide", icon: BookOpen, label: "User Guide" },
];

export const PortalSidebar = () => {
  const { user } = useSession();

  return (
  <aside className="w-64 bg-chip/40 border-r border-border/50 flex flex-col py-6 sticky top-0 h-screen">
    <Link href="/" className="px-6 flex items-center gap-2">
      <img src={BRAND_INFO.logo} alt={`${BRAND_INFO.name} logo`} className="h-12 w-12 object-contain" />
      <div>
        <div className="font-display text-xl text-primary font-bold">{BRAND_INFO.name}</div>
        <p className="text-[10px] tracking-widest font-semibold text-primary-glow mt-0.5">DOCTOR PORTAL</p>
      </div>
    </Link>

    <div className="px-6 mt-10 flex items-center gap-3">
      <Avatar src={user?.avatarUrl} name={displayName(user)} className="h-12 w-12" />
      <div>
        <p className="font-display text-lg text-primary leading-tight">{displayName(user)}</p>
        {/* TODO: specialty comes from the doctors row for this profile_id.
            Needs a lookup that does not exist yet, so left static. */}
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

    <div className="px-6 text-[10px] tracking-widest font-semibold text-muted-foreground">{BRAND_INFO.copyrightUppercase}</div>
  </aside>
  );
};

export const PortalTopbar = () => {
  const router = useRouter();
  const { user, signOut } = useSession();
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
              <p className="font-semibold text-sm text-primary leading-tight">{displayName(user)}</p>
              <p className="text-[10px] tracking-widest font-bold text-primary-glow">{roleLabel(user?.role).toUpperCase()}</p>
            </div>
            <Avatar src={user?.avatarUrl} name={displayName(user)} />
          </div>
          <button onClick={async () => { await signOut(); toast.success("Signed out"); router.replace("/signin"); router.refresh(); }}
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

