"use client";

import { useState } from "react";
import Link from "next/link";
import { NavLink } from "@/components/NavLink";
import { useRouter } from "next/navigation";
import {
  LayoutGrid,
  Calendar,
  Users,
  CreditCard,
  FileText,
  User,
  LogOut,
  Bell,
  Settings,
  BookOpen,
  Heart,
  Hospital,
  Menu,
  X,
  TestTube2,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/site/LanguageSwitcher";
import { HeaderClock } from "@/components/common/HeaderClock";
import { useSession, displayName } from "@/lib/auth/useSession";
import { useRoleLabel } from "@/i18n/useRoleLabel";
import { BRAND_INFO } from "@/constants/brand";
import { Avatar } from "@/components/common/Avatar";
import { useSidebarScroll } from "@/hooks/useSidebarScroll";

export const PatientSidebar = ({ onNavigate }: { onNavigate?: () => void }) => {
  const t = useTranslations();
  const asideRef = useSidebarScroll<HTMLElement>("patient");
  const links = [
    { to: "/patient/dashboard", icon: LayoutGrid, label: t("sidebar.dashboard") },
    { to: "/patient/find-hospitals", icon: Hospital, label: t("sidebar.findHospitals") },
    { to: "/patient/find-doctors", icon: Users, label: t("sidebar.findDoctors") },
    { to: "/patient/appointments", icon: Calendar, label: t("sidebar.appointments") },
    { to: "/patient/saved-doctors", icon: Heart, label: t("sidebar.savedDoctors") },
    { to: "/patient/billing", icon: CreditCard, label: t("sidebar.billing") },
    { to: "/patient/medical-records", icon: FileText, label: t("sidebar.medicalRecords") },
    { to: "/patient/lab-reports", icon: TestTube2, label: t("sidebar.labReports") || "Lab Reports" },
    { to: "/patient/profile", icon: User, label: t("sidebar.myProfile") },
    { to: "/patient/tutorial", icon: BookOpen, label: t("sidebar.userGuide") },
  ];
  return (
    <aside ref={asideRef} className="w-64 bg-chip/40 border-r border-border/50 flex flex-col py-6 sticky top-0 h-screen shrink-0 overflow-y-auto">
      <Link href="/" className="px-6 flex items-center gap-2">
        <img src={BRAND_INFO.logoMark} alt={`${BRAND_INFO.name} logo`} className="h-8 w-auto shrink-0" />
        <div>
          <div className="font-display text-xl text-primary font-bold">{BRAND_INFO.name}</div>
          <p className="text-[10px] tracking-widest font-semibold text-primary-glow mt-0.5">{t("sidebar.patientPortal")}</p>
        </div>
      </Link>

      <nav className="mt-10 px-3 flex-1 flex flex-col gap-1">
        {links.map(l => (
          <NavLink key={l.to} to={l.to} onClick={onNavigate}
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive ? "bg-card text-primary shadow-soft" : "text-foreground/70 hover:bg-card/60"}`}>
            <l.icon className="h-4 w-4" /> {l.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 text-[10px] tracking-widest font-semibold text-muted-foreground">{BRAND_INFO.copyrightUppercase}</div>
    </aside>
  );
};

export const PatientTopbar = ({ onMenu, menuOpen = false }: { onMenu?: () => void; menuOpen?: boolean }) => {
  const router = useRouter();
  const { user, signOut } = useSession();
  const t = useTranslations();
  const locale = useLocale();
  const isBn = locale === "bn";
  const roleLabel = useRoleLabel();

  const [notifications, setNotifications] = useState([
    {
      id: "1",
      title: isBn ? "আসন্ন কনসাল্টেশন" : "Upcoming Consultation",
      message: isBn ? "আপনার ডাক্তার অ্যাপয়েন্টমেন্ট শিডিউল অনুযায়ী প্রস্তুত রাখুন।" : "Your appointment is confirmed. View details in Appointments.",
      time: isBn ? "আজ" : "Today",
      unread: true,
      link: "/patient/appointments",
    },
    {
      id: "2",
      title: isBn ? "ল্যাব টেস্ট আপডেট" : "Diagnostic Orders Tracked",
      message: isBn ? "নতুন ডায়াগনস্টিক রিপোর্ট প্রস্তুত হলে এখানে নোটিফিকেশন পাবেন।" : "Track your clinical pathology and radiology reports.",
      time: isBn ? "নতুন" : "New",
      unread: true,
      link: "/patient/lab-reports",
    },
    {
      id: "3",
      title: isBn ? "জরুরি হেল্পলাইন সক্রিয়" : "Emergency Helplines Active",
      message: isBn ? "জাতীয় স্বাস্থ্য সেবা ১৬২৬৩ ও জরুরি ৯৯৯ হেল্পলাইন ড্যাশবোর্ডে যুক্ত।" : "National emergency 999 and health 16263 are ready on your dashboard.",
      time: isBn ? "সতর্কতা" : "Notice",
      unread: false,
      link: "/patient/dashboard",
    },
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    toast.success(isBn ? "সকল নোটিফিকেশন পঠিত হিসেবে চিহ্নিত করা হয়েছে" : "All notifications marked as read");
  };

  return (
    // On a phone: the menu button, and only what fits beside it. The clock,
    // settings and the name give way; sign-out keeps its icon.
    <header className="bg-card border-b border-border/50 sticky top-0 z-30">
      <div className="flex items-center justify-between gap-3 px-4 lg:px-8 py-4">
        <button className="lg:hidden p-2 -ml-2" onClick={onMenu} aria-label={t("common.menu")}>
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="hidden lg:block" />
        <div className="flex items-center gap-3 lg:gap-5">
          <div className="hidden md:block"><HeaderClock /></div>
          <LanguageSwitcher compact />

          {/* Interactive Notifications Bell */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="relative text-foreground/70 hover:text-primary p-1.5 rounded-full hover:bg-chip/50 transition"
                aria-label={t("common.notifications")}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full grid place-items-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 md:w-96 p-0 rounded-3xl border-border shadow-2xl">
              <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <div>
                  <h4 className="font-display text-base font-bold text-primary">
                    {isBn ? "বিজ্ঞপ্তি ও নোটিফিকেশন" : "Patient Notifications"}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    {unreadCount > 0
                      ? isBn ? `${unreadCount}টি অপঠিত বার্তা রয়েছে` : `${unreadCount} unread notices`
                      : isBn ? "কোনো নতুন বার্তা নেই" : "You're all caught up"}
                  </p>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    {isBn ? "পঠিত করুন" : "Mark read"}
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-border/40 p-1">
                {notifications.map(n => (
                  <Link
                    key={n.id}
                    href={n.link}
                    onClick={() => {
                      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, unread: false } : x));
                    }}
                    className={`block p-3.5 rounded-2xl transition hover:bg-chip/40 ${
                      n.unread ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                        {n.unread && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                        {n.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground font-mono">{n.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                  </Link>
                ))}
              </div>

              <div className="p-3 border-t border-border/50 text-center bg-chip/20 rounded-b-3xl">
                <Link
                  href="/patient/appointments"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {isBn ? "সমস্ত অ্যাপয়েন্টমেন্ট ও রিপোর্ট দেখুন" : "View appointments & health records →"}
                </Link>
              </div>
            </PopoverContent>
          </Popover>

          <NavLink to="/patient/profile" aria-label={t("common.profile")} className={({ isActive }) => `text-foreground/70 hover:text-primary transition ${isActive ? "text-primary" : ""}`}>
            <User className="h-5 w-5" />
          </NavLink>
          <div className="flex items-center gap-3 sm:border-l border-border/60 sm:pl-5">
            <div className="hidden sm:block text-right">
              <p className="font-semibold text-sm text-primary leading-tight">{displayName(user)}</p>
              <p className="text-[10px] tracking-widest font-bold text-primary-glow">{roleLabel(user?.role).toUpperCase()}</p>
            </div>
            <Avatar src={user?.avatarUrl} name={displayName(user)} />
          </div>
          <button onClick={async () => { await signOut(); toast.success(t("common.signedOut")); router.replace("/signin"); router.refresh(); }}
            aria-label={t("sidebar.signOut")}
            className="flex items-center gap-2 text-sm font-semibold text-foreground/70 hover:text-destructive">
            <LogOut className="h-4 w-4" /> <span className="hidden md:inline">{t("sidebar.signOut")}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

/**
 * The sidebar sits beside the page from lg; below that it opens over the
 * page from the header's menu button, as the admin panel's does. It used to
 * take 256px of a 375px phone at all times.
 */
export const PatientPortalLayout = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen flex bg-gradient-hero">
      <div className="hidden lg:block"><PatientSidebar /></div>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative bg-background"><PatientSidebar onNavigate={() => setOpen(false)} /></div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <PatientTopbar onMenu={() => setOpen(v => !v)} menuOpen={open} />
        <main className="flex-1 p-4 lg:p-8 min-w-0">{children}</main>
      </div>
    </div>
  );
};

