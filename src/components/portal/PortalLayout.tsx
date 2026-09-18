"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavLink } from "@/components/NavLink";
import { useRouter } from "next/navigation";
import { LayoutGrid, Users, BookUser, Calendar, LogOut, Bell, Settings, BookOpen, MessagesSquare, UserRound, Store, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/site/LanguageSwitcher";
import { HeaderClock } from "@/components/common/HeaderClock";
import { useSession, displayName } from "@/lib/auth/useSession";
import { useRoleLabel } from "@/i18n/useRoleLabel";
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
  { to: "/portal/prescription", icon: LayoutGrid, key: "prescription" },
  { to: "/portal/queue", icon: Users, key: "queue" },
  { to: "/portal/directory", icon: BookUser, key: "directory" },
  { to: "/portal/schedule", icon: Calendar, key: "schedule" },
  { to: "/portal/chambers", icon: Store, key: "chambers" },
  { to: "/portal/team", icon: UsersRound, key: "team" },
  { to: "/portal/community", icon: MessagesSquare, key: "community" },
  { to: "/portal/profile", icon: UserRound, key: "myProfile" },
  { to: "/portal/user-guide", icon: BookOpen, key: "userGuide" },
] as const;

export const PortalSidebar = () => {
  const t = useTranslations("sidebar");
  return (
    <aside className="w-64 bg-chip/40 border-r border-border/50 flex flex-col py-6 sticky top-0 h-screen">
      <Link href="/" className="px-6 flex items-center gap-2">
        <img src={BRAND_INFO.logoMark} alt={`${BRAND_INFO.name} logo`} className="h-8 w-auto shrink-0" />
        <div>
          <div className="font-display text-xl text-primary font-bold">{BRAND_INFO.name}</div>
          <p className="text-[10px] tracking-widest font-semibold text-primary-glow mt-0.5">{t("doctorPortal")}</p>
        </div>
      </Link>

      <nav className="mt-10 px-3 flex-1 flex flex-col gap-1">
        {links.map(l => (
          <NavLink key={l.to} to={l.to}
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive ? "bg-card text-primary shadow-soft" : "text-foreground/70 hover:bg-card/60"}`}>
            <l.icon className="h-4 w-4" /> {t(l.key)}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 text-[10px] tracking-widest font-semibold text-muted-foreground">{BRAND_INFO.copyrightUppercase}</div>
    </aside>
  );
};

export const PortalTopbar = () => {
  const tc = useTranslations("common");
  const roleLabel = useRoleLabel();
  const router = useRouter();
  const { user, signOut } = useSession();
  const [doctorPhoto, setDoctorPhoto] = useState<string | null>(null);

  // A doctor's photo lives on `doctors`, not on their profile, so the session
  // alone only ever had initials to draw. /portal/me answers null for anyone
  // who is not a doctor, and they keep their profile picture.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/v1/portal/me");
        const body = await res.json();
        if (!cancelled && res.ok) setDoctorPhoto(body.data?.photo_url ?? null);
      } catch {
        // No photo is not worth an error in the header; initials still draw.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <header className="bg-card border-b border-border/50">
      <div className="flex items-center justify-between px-8 py-4">
        <div />
        <div className="flex items-center gap-5">
          <HeaderClock />
          <LanguageSwitcher compact />
          <button className="text-foreground/70 hover:text-primary" aria-label={tc("notifications")}><Bell className="h-5 w-5" /></button>
          <button className="text-foreground/70 hover:text-primary" aria-label={tc("settings")}><Settings className="h-5 w-5" /></button>
          <div className="flex items-center gap-3 border-l border-border/60 pl-5">
            <div className="text-right">
              <p className="font-semibold text-sm text-primary leading-tight">{displayName(user)}</p>
              <p className="text-[10px] tracking-widest font-bold text-primary-glow">{roleLabel(user?.role).toUpperCase()}</p>
            </div>
            <Avatar src={doctorPhoto ?? user?.avatarUrl} name={displayName(user)} />
          </div>
          <button onClick={async () => { await signOut(); toast.success(tc("signedOut")); router.replace("/signin"); router.refresh(); }}
            className="flex items-center gap-2 text-sm font-semibold text-foreground/70 hover:text-destructive">
            <LogOut className="h-4 w-4" /> {tc("signOut")}
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

