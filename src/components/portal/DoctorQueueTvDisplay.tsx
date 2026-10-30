"use client";

import { useEffect, useState, useMemo } from "react";
import {
  X, Volume2, VolumeX, Maximize2, Minimize2, Clock, Users, CheckCircle2,
  Stethoscope, Building2, BellRing, UserCheck, ShieldAlert, ExternalLink, Copy, Check, Share2, Radio,
  Sun, Moon, Heart, Coffee
} from "lucide-react";
import { playSound } from "@/lib/audio";
import { BREAK_MINUTES_KEY, breakCopy, DEFAULT_BREAK_MINUTES, validBreakMinutes } from "@/lib/portal/breakTimer";

/** The running break's length as its doctor chose it, for a screen that reloaded mid-break. */
const storedBreakMinutes = () => {
  try {
    return validBreakMinutes(localStorage.getItem(BREAK_MINUTES_KEY)) ?? undefined;
  } catch {
    return undefined;
  }
};

/** A break restored from its end time: the full length when known, else what is left. */
const restoredBreak = (endsAt: number): BreakState => {
  const minutes = storedBreakMinutes();
  return {
    active: true,
    endsAt,
    totalSeconds: minutes ? minutes * 60 : Math.max(60, Math.round((endsAt - Date.now()) / 1000)),
    minutes,
  };
};
import { useLocale } from "next-intl";
import { toast } from "sonner";

export type TvQueueEntry = {
  id: string;
  scheduled_time: string;
  priority: "high" | "standard" | "routine";
  reason: string | null;
  walk_in?: boolean;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  in_consultation: boolean;
  waited_minutes: number;
  hospital: { id: string; name: string };
  patient: {
    id: string;
    mrn?: string;
    full_name: string;
    date_of_birth: string | null;
    phone: string | null;
    gender?: string | null;
    blood_group?: string | null;
    weight_kg?: number | null;
  } | null;
};

type CallingTokenItem = {
  token: string;
  name: string;
  time: string;
  purpose?: string;
};

type BreakState = {
  active: boolean;
  endsAt: number;
  totalSeconds: number;
  /** Length the break was started with; unset when restored from storage after a reload. */
  minutes?: number;
};

type Props = {
  queue: TvQueueEntry[];
  completedCount: number;
  avgWaitMinutes: number;
  doctorName?: string;
  doctorSpecialty?: string | null;
  doctorEducation?: string | null;
  chamberName?: string;
  callingToken: CallingTokenItem | null;
  initialBreakEndsAt?: number | null;
  onCallToken: (token: string, name: string, purpose?: string) => void;
  onClose: () => void;
  onRefresh?: () => void;
};

export const DoctorQueueTvDisplay = ({
  queue,
  completedCount,
  avgWaitMinutes,
  doctorName,
  doctorSpecialty,
  doctorEducation,
  chamberName,
  callingToken: initialCallingToken,
  initialBreakEndsAt,
  onCallToken,
  onClose,
  onRefresh,
}: Props) => {
  const locale = useLocale();
  const isBn = locale === "bn";

  // Light mode by default as requested by user, with optional dark mode toggle
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeCallingToken, setActiveCallingToken] = useState<CallingTokenItem | null>(
    initialCallingToken
  );
  const [breakState, setBreakState] = useState<BreakState | null>(() => {
    if (initialBreakEndsAt && initialBreakEndsAt > Date.now()) {
      return restoredBreak(initialBreakEndsAt);
    }
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("healthflow_queue_break_ends_at");
        if (stored) {
          const parsed = Number(stored);
          if (parsed > Date.now()) {
            return restoredBreak(parsed);
          } else {
            localStorage.removeItem("healthflow_queue_break_ends_at");
          }
        }
      } catch {}
    }
    return null;
  });
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  // Live countdown timer for Doctor's break
  useEffect(() => {
    if (!breakState?.active) {
      setSecondsLeft(0);
      return;
    }

    const tick = () => {
      const diff = Math.max(0, Math.round((breakState.endsAt - Date.now()) / 1000));
      setSecondsLeft(diff);
      if (diff <= 0) {
        setBreakState(null);
        try {
          localStorage.removeItem("healthflow_queue_break_ends_at");
        } catch {}
        if (soundEnabled) {
          playSound("chime");
        }
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [breakState, soundEnabled]);

  // Sync prop changes
  useEffect(() => {
    if (initialCallingToken) {
      setActiveCallingToken(initialCallingToken);
    }
  }, [initialCallingToken]);

  // Inter-window BroadcastChannel for instant call announcements across tabs/monitors
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("healthflow_queue_broadcast");
      channel.onmessage = (event) => {
        if (event.data?.type === "CALL_TOKEN" && event.data?.data) {
          const item = event.data.data;
          setActiveCallingToken(item);
          if (soundEnabled) {
            playSound("chime");
            if (typeof window !== "undefined" && "speechSynthesis" in window) {
              try {
                const isVitals = item.purpose === "vitals";
                const text = isVitals
                  ? (isBn
                    ? `টোকেন নম্বর ${item.token}, ${item.name}, অনুগ্রহ করে ভাইটালস ও রক্তচাপ মাপার ডেস্কে আসুন`
                    : `Token number ${item.token}, ${item.name}, please proceed for vitals and blood pressure check`)
                  : (isBn
                    ? `টোকেন নম্বর ${item.token}, ${item.name}, অনুগ্রহ করে ডাক্তারের চেম্বারে আসুন`
                    : `Token number ${item.token}, ${item.name}, please enter doctor's consultation chamber`);
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = 0.95;
                utterance.pitch = 1.0;
                window.speechSynthesis.speak(utterance);
              } catch {}
            }
          }
          // Auto-dismiss banner after 12s
          setTimeout(() => {
            setActiveCallingToken((curr) => (curr?.token === item.token ? null : curr));
          }, 12000);
        } else if (event.data?.type === "BREAK_START" && event.data?.data) {
          const { endsAt } = event.data.data;
          // The length the doctor chose at the button, carried on the broadcast.
          const minutes: number = validBreakMinutes(event.data.data.minutes) ?? DEFAULT_BREAK_MINUTES;
          const targetEnd = endsAt || Date.now() + minutes * 60 * 1000;
          try {
            localStorage.setItem("healthflow_queue_break_ends_at", String(targetEnd));
          } catch {}
          setBreakState({
            active: true,
            endsAt: targetEnd,
            totalSeconds: minutes * 60,
            minutes,
          });
          setActiveCallingToken(null);
          if (soundEnabled) {
            playSound("chime");
            if (typeof window !== "undefined" && "speechSynthesis" in window) {
              try {
                const utterance = new SpeechSynthesisUtterance(breakCopy(minutes, isBn).announcement);
                utterance.rate = 0.95;
                utterance.pitch = 1.0;
                window.speechSynthesis.speak(utterance);
              } catch {}
            }
          }
        } else if (event.data?.type === "BREAK_END") {
          try {
            localStorage.removeItem("healthflow_queue_break_ends_at");
          } catch {}
          setBreakState(null);
        } else if (event.data?.type === "QUEUE_REFRESH") {
          onRefresh?.();
        }
      };
    } catch {}

    return () => {
      channel?.close();
    };
  }, [isBn, soundEnabled, onRefresh]);

  // Periodic Auto-refresh every 20 seconds while TV display is live
  useEffect(() => {
    if (!onRefresh) return;
    const interval = setInterval(() => {
      onRefresh();
    }, 20000);
    return () => clearInterval(interval);
  }, [onRefresh]);

  // Live ticking clock
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString(isBn ? "bn-BD-u-nu-latn" : "en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString(isBn ? "bn-BD-u-nu-latn" : "en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isBn]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleCopyTvLink = () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/portal/queue?tv=1`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      toast.success(isBn ? "টিভি ডিসপ্লে লিঙ্ক কপি করা হয়েছে" : "TV Display URL copied to clipboard");
      setTimeout(() => setCopiedLink(false), 3000);
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };

  const handlePopoutWindow = () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/portal/queue?tv=1`;
    window.open(url, "HealthFlowLoungeTv", "width=1280,height=720,menubar=no,toolbar=no,location=no,status=no");
    toast.info(isBn ? "নতুন উইন্ডোতে টিভি স্ক্রিন খোলা হয়েছে" : "Opened Lounge TV in dedicated window");
  };

  const handleNativeShare = () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/portal/queue?tv=1`;
    if (navigator.share) {
      navigator.share({
        title: "HealthFlow Doctor OPD TV Queue",
        text: `Live OPD Queue Display for ${doctorName || "Doctor Chamber"}`,
        url,
      }).catch(() => {});
    } else {
      handleCopyTvLink();
    }
  };

  // Find currently serving patient (in_consultation is true) or first in line
  const activePatient = useMemo(() => {
    return queue.find((p) => p.in_consultation);
  }, [queue]);

  const activeIndex = useMemo(() => {
    if (!activePatient) return -1;
    return queue.findIndex((p) => p.id === activePatient.id);
  }, [queue, activePatient]);

  // Upcoming waiting patients (excluding the one currently inside)
  const upcomingQueue = useMemo(() => {
    return queue.filter((p) => !p.in_consultation);
  }, [queue]);

  const formatCountdown = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // The length the break was started with; 10 only if a reload lost it.
  const shownBreakMinutes = breakState?.minutes ?? DEFAULT_BREAK_MINUTES;
  const breakText = breakCopy(shownBreakMinutes, isBn);

  const breakResumptionTime = useMemo(() => {
    if (!breakState?.endsAt) return "";
    try {
      return new Date(breakState.endsAt).toLocaleTimeString(isBn ? "bn-BD-u-nu-latn" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "";
    }
  }, [breakState?.endsAt, isBn]);

  const testChime = () => {
    playSound("chime");
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col p-4 sm:p-6 md:p-8 select-none overflow-hidden font-sans transition-colors duration-200 ${
        isDarkMode ? "bg-slate-950 text-white" : "bg-[#f8fafc] text-slate-900"
      }`}
    >
      {/* Top Lounge Bar */}
      <div
        className={`flex items-center justify-between border-b pb-4 sm:pb-5 ${
          isDarkMode ? "border-slate-800" : "border-slate-200"
        }`}
      >
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div
            className={`h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center shrink-0 ${
              isDarkMode
                ? "bg-primary/20 border border-primary/30 text-primary shadow-glow"
                : "bg-primary/10 border border-primary/20 text-primary shadow-xs"
            }`}
          >
            <Stethoscope className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <div>
            {chamberName && (
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold flex items-center gap-1 ${
                    isDarkMode ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5" /> {chamberName}
                </span>
              </div>
            )}
            <h1
              className={`text-2xl sm:text-3xl font-black tracking-tight mt-0.5 ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              {doctorName || (isBn ? "ডাক্তার ওপিডি চেম্বার" : "Doctor Consultation Hall")}
            </h1>
            <p className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              {[doctorSpecialty, doctorEducation].filter(Boolean).join(" · ") ||
                (isBn ? "রোগী দেখার কিউ ডিসপ্লে" : "Patient Queue Display Board")}
            </p>
          </div>
        </div>

        {/* Live Clock & Action Controls */}
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="text-right hidden sm:block">
            <p
              className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                isDarkMode ? "text-emerald-400" : "text-slate-900"
              }`}
            >
              {currentTime}
            </p>
            <p className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              {currentDate}
            </p>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Light / Dark Mode Toggle */}
            <button
              onClick={() => setIsDarkMode((v) => !v)}
              className={`p-2.5 rounded-xl border transition-colors ${
                isDarkMode
                  ? "border-slate-700 bg-slate-900 hover:bg-slate-800 text-amber-300"
                  : "border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs"
              }`}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Popout to separate monitor / TV window */}
            <button
              onClick={handlePopoutWindow}
              className={`p-2.5 rounded-xl border transition-colors hidden sm:flex items-center gap-1.5 text-xs font-semibold ${
                isDarkMode
                  ? "border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300"
                  : "border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs"
              }`}
              title="Pop out into separate window for Lounge TV / External Monitor"
            >
              <ExternalLink className="h-4 w-4" />
              <span>{isBn ? "আলাদা উইন্ডো" : "Pop-out TV"}</span>
            </button>

            {/* Copy / Share Link */}
            <button
              onClick={handleNativeShare}
              className={`p-2.5 rounded-xl border transition-colors ${
                isDarkMode
                  ? "border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300"
                  : "border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs"
              }`}
              title="Share or Copy TV Link"
            >
              {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
            </button>

            {/* Sound toggle */}
            <button
              onClick={() => {
                setSoundEnabled((v) => !v);
                testChime();
              }}
              className={`p-2.5 rounded-xl border transition-colors ${
                isDarkMode
                  ? soundEnabled
                    ? "bg-slate-900 border-slate-700 text-primary hover:bg-slate-800"
                    : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400"
                  : soundEnabled
                    ? "bg-white border-slate-200 text-primary hover:bg-slate-100 shadow-2xs"
                    : "bg-white border-slate-200 text-slate-400 hover:bg-slate-100 shadow-2xs"
              }`}
              title={soundEnabled ? "Mute Chime" : "Unmute Chime"}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>

            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              className={`p-2.5 rounded-xl border transition-colors ${
                isDarkMode
                  ? "border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300"
                  : "border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs"
              }`}
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className={`p-2.5 rounded-xl border transition-colors ${
                isDarkMode
                  ? "border-rose-500/30 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300"
                  : "border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 shadow-2xs"
              }`}
              title="Close TV Mode"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calling Announcement Banner when active */}
      {activeCallingToken && (
        <div
          className={`mt-4 p-4 sm:p-5 rounded-2xl flex items-center justify-between shadow-xl animate-bounce ${
            activeCallingToken.purpose === "vitals"
              ? isDarkMode
                ? "bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-700 text-white border border-blue-500/40"
                : "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 text-white border border-blue-400"
              : isDarkMode
                ? "bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950"
                : "bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-slate-950 border border-amber-500/40"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                activeCallingToken.purpose === "vitals"
                  ? "bg-white text-blue-700 shadow-md"
                  : "bg-slate-950 text-amber-400"
              }`}
            >
              {activeCallingToken.purpose === "vitals" ? (
                <Heart className="h-7 w-7 text-rose-600 animate-pulse" />
              ) : (
                <BellRing className="h-7 w-7 animate-pulse" />
              )}
            </div>
            <div>
              <p
                className={`text-[11px] font-black uppercase tracking-widest ${
                  activeCallingToken.purpose === "vitals" ? "text-blue-100" : "text-slate-900"
                }`}
              >
                {activeCallingToken.purpose === "vitals"
                  ? (isBn ? "ভাইটালস ও রক্তচাপ পরিমাপ সংকেত" : "VITALS & BP MEASUREMENT CALL")
                  : (isBn ? "এখন কল করা হচ্ছে" : "NOW CALLING TOKEN")}
              </p>
              <p className="text-4xl font-black font-mono tracking-tight leading-none mt-0.5">
                TOKEN {activeCallingToken.token}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl sm:text-2xl font-black">{activeCallingToken.name}</p>
            <p
              className={`text-xs font-bold mt-0.5 ${
                activeCallingToken.purpose === "vitals" ? "text-blue-100" : "text-slate-800"
              }`}
            >
              {activeCallingToken.purpose === "vitals"
                ? (isBn
                  ? "অনুগ্রহ করে ভাইটালস ও রক্তচাপ (বিপি) মাপার ডেস্কে আসুন"
                  : "Please proceed to the Nurse Station for Vitals & BP check")
                : (isBn
                  ? "অনুগ্রহ করে ডাক্তারের চেম্বারে প্রবেশ করুন"
                  : "Please proceed into the Doctor's Consultation Chamber")}
            </p>
          </div>
        </div>
      )}

      {/* Break Time Live Countdown Banner on TV Board */}
      {breakState?.active && secondsLeft > 0 && (
        <div
          className={`mt-4 p-5 sm:p-6 rounded-3xl border shadow-2xl relative overflow-hidden transition-all ${
            isDarkMode
              ? "bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-950/90 border-amber-500/50 text-white"
              : "bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50 border-amber-300 text-slate-900 shadow-amber-500/10"
          }`}
        >
          {/* Subtle animated background glow */}
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-5 relative z-10">
            {/* Left: Icon & Description */}
            <div className="flex items-center gap-4 sm:gap-5 w-full md:w-auto">
              <div
                className={`h-16 w-16 sm:h-20 sm:w-20 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                  isDarkMode
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-amber-500 text-white shadow-amber-500/30"
                }`}
              >
                <Coffee className="h-9 w-9 sm:h-11 sm:w-11 animate-pulse" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider ${
                      isDarkMode
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-amber-200/80 text-amber-900 border border-amber-300"
                    }`}
                  >
                    {breakText.tvBadge}
                  </span>
                  {breakResumptionTime && (
                    <span className={`text-xs ${isDarkMode ? "text-amber-400/80" : "text-amber-800 font-semibold"}`}>
                      • {isBn ? "পুনরায় শুরু" : "Resumes at"}: {breakResumptionTime}
                    </span>
                  )}
                </div>

                <h3 className="text-xl sm:text-2xl font-black mt-1 tracking-tight">
                  {isBn ? "ডাক্তারের পরামর্শে সাময়িক চা-বিরতি" : "Doctor's Consultation Break"}
                </h3>

                <p className={`text-xs sm:text-sm mt-0.5 max-w-xl ${isDarkMode ? "text-slate-300" : "text-slate-600 font-medium"}`}>
                  {breakText.tvNotice}
                </p>
              </div>
            </div>

            {/* Right: Giant Digital Countdown Clock & Progress */}
            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
              <div
                className={`px-6 py-3 sm:py-4 rounded-2xl border text-center shadow-inner ${
                  isDarkMode
                    ? "bg-slate-950/80 border-amber-500/30"
                    : "bg-white/95 border-amber-200 shadow-xs"
                }`}
              >
                <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-amber-400" : "text-amber-800"}`}>
                  {isBn ? "অবশিষ্ট সময়" : "TIME REMAINING"}
                </p>
                <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-amber-500 mt-0.5">
                  {formatCountdown(secondsLeft)}
                </div>
              </div>

              {/* Dismiss / End early button */}
              <button
                onClick={() => {
                  setBreakState(null);
                  try {
                    localStorage.removeItem("healthflow_queue_break_ends_at");
                    const channel = new BroadcastChannel("healthflow_queue_broadcast");
                    channel.postMessage({ type: "BREAK_END" });
                    channel.close();
                  } catch {}
                }}
                className={`p-3 rounded-2xl border transition-all text-xs font-bold flex flex-col items-center gap-1 shrink-0 ${
                  isDarkMode
                    ? "bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300"
                    : "bg-white border-slate-200 hover:bg-amber-50 text-slate-700 shadow-2xs"
                }`}
                title="End break early"
              >
                <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                <span className="text-[10px]">{isBn ? "শেষ করুন" : "Dismiss"}</span>
              </button>
            </div>
          </div>

          {/* Countdown Progress Bar */}
          <div className="mt-4 pt-3 border-t border-amber-200/50 dark:border-amber-500/20">
            <div className="h-2 w-full rounded-full bg-amber-200/50 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-1000 ease-linear"
                style={{
                  width: `${Math.max(0, Math.min(100, (secondsLeft / (breakState.totalSeconds || shownBreakMinutes * 60)) * 100))}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 my-5 sm:my-6 flex-1 min-h-0">
        {/* Left Spotlight: Active Patient in Chamber (5 cols) */}
        <div
          className={`lg:col-span-5 rounded-3xl border p-5 sm:p-6 flex flex-col justify-between shadow-xl relative overflow-hidden transition-colors ${
            isDarkMode
              ? "border-slate-800 bg-slate-900/90 text-white"
              : "border-slate-200/90 bg-white text-slate-900"
          }`}
        >
          <div
            className={`absolute top-0 right-0 p-8 pointer-events-none ${
              isDarkMode ? "text-white opacity-5" : "text-primary/10 opacity-30"
            }`}
          >
            <Stethoscope className="w-64 h-64" />
          </div>

          <div
            className={`flex items-center justify-between border-b pb-4 relative z-10 ${
              isDarkMode ? "border-slate-800" : "border-slate-100"
            }`}
          >
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                {isBn ? "পরামর্শ কক্ষ" : "CONSULTATION CHAMBER"}
              </span>
              <h2
                className={`text-lg font-bold mt-0.5 ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                {isBn ? "চলমান পরামর্শ" : "Currently In Chamber"}
              </h2>
            </div>
            {activePatient && (
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border animate-pulse ${
                  isDarkMode
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : "bg-emerald-50 text-emerald-700 border-emerald-300"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${isDarkMode ? "bg-emerald-400" : "bg-emerald-600"}`} />
                {isBn ? "পরামর্শ চলছে" : "IN CONSULTATION"}
              </span>
            )}
          </div>

          <div className="py-6 sm:py-8 text-center relative z-10">
            {activePatient ? (
              <div className="space-y-4">
                <div
                  className={`inline-block p-5 sm:p-6 rounded-3xl border shadow-inner ${
                    isDarkMode
                      ? "bg-slate-950/80 border-slate-800"
                      : "bg-gradient-to-b from-emerald-50/80 via-emerald-100/40 to-emerald-50/80 border-emerald-200 shadow-sm"
                  }`}
                >
                  <p
                    className={`text-[11px] font-bold uppercase tracking-widest ${
                      isDarkMode ? "text-slate-400" : "text-emerald-800"
                    }`}
                  >
                    {isBn ? "টোকেন নম্বর" : "TOKEN NUMBER"}
                  </p>
                  <p
                    className={`text-7xl sm:text-8xl font-black font-mono tracking-tighter mt-1 animate-pulse ${
                      isDarkMode ? "text-emerald-400" : "text-emerald-600"
                    }`}
                  >
                    {String(activeIndex + 1).padStart(2, "0")}
                  </p>
                </div>

                <div>
                  <h3
                    className={`text-2xl sm:text-3xl font-black truncate px-4 ${
                      isDarkMode ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {activePatient.patient?.full_name ?? (isBn ? "রোগী" : "Patient")}
                  </h3>
                  <div className="flex items-center justify-center gap-3 text-xs font-medium mt-2">
                    {activePatient.patient?.mrn && (
                      <span
                        className={`font-mono px-2 py-0.5 rounded-full ${
                          isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700 font-bold"
                        }`}
                      >
                        #{activePatient.patient.mrn}
                      </span>
                    )}
                    {activePatient.reason && (
                      <span
                        className={`truncate max-w-[200px] ${
                          isDarkMode ? "text-slate-300" : "text-slate-600"
                        }`}
                      >
                        ({activePatient.reason})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() =>
                      onCallToken(
                        String(activeIndex + 1).padStart(2, "0"),
                        activePatient.patient?.full_name ?? "Patient"
                      )
                    }
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      isDarkMode
                        ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40"
                        : "bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300"
                    }`}
                  >
                    <BellRing className="h-3.5 w-3.5" />
                    {isBn ? "পুনরায় কল করুন" : "Recall Token"}
                  </button>
                </div>
              </div>
            ) : breakState?.active && secondsLeft > 0 ? (
              <div className="py-8 sm:py-10 space-y-3">
                <div
                  className={`h-20 w-20 rounded-full border flex items-center justify-center mx-auto ${
                    isDarkMode
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                      : "bg-amber-100 border-amber-300 text-amber-600 shadow-sm"
                  }`}
                >
                  <Coffee className="h-10 w-10 animate-pulse" />
                </div>
                <p
                  className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                    isDarkMode ? "text-amber-400" : "text-amber-700"
                  }`}
                >
                  {breakText.tvHeading}
                </p>
                <div className="text-5xl font-black font-mono tracking-tight text-amber-500">
                  {formatCountdown(secondsLeft)}
                </div>
                <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-600 font-medium"}`}>
                  {isBn
                    ? `বিরতি শেষে সিরিয়াল অনুযায়ী শুরু হবে (পুনরায় শুরু: ${breakResumptionTime})`
                    : `Consultation resumes in token order (at: ${breakResumptionTime})`}
                </p>
              </div>
            ) : (
              <div className="py-10 sm:py-12 space-y-3">
                <div
                  className={`h-20 w-20 rounded-full border flex items-center justify-center mx-auto ${
                    isDarkMode
                      ? "bg-slate-800/60 border-slate-700/60 text-slate-500"
                      : "bg-slate-100 border-slate-200 text-slate-400"
                  }`}
                >
                  <UserCheck className="h-10 w-10" />
                </div>
                <p
                  className={`text-2xl font-bold font-mono tracking-tight ${
                    isDarkMode ? "text-slate-400" : "text-slate-700"
                  }`}
                >
                  {isBn ? "— চেম্বার প্রস্তুত —" : "— CHAMBER READY —"}
                </p>
                <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                  {isBn ? "পরবর্তী রোগীকে আমন্ত্রণ জানানো হচ্ছে" : "Awaiting next scheduled patient"}
                </p>
              </div>
            )}
          </div>

          <div
            className={`border-t pt-3 flex items-center justify-between text-xs relative z-10 ${
              isDarkMode ? "border-slate-800 text-slate-400" : "border-slate-100 text-slate-500"
            }`}
          >
            <span>{isBn ? "পরামর্শ কক্ষ নং ১" : "Doctor Desk / Chamber 01"}</span>
            <span className={`font-semibold ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}>
              {isBn ? "সক্রিয় ডেস্ক" : "OPD Active"}
            </span>
          </div>
        </div>

        {/* Right Section: Upcoming Queue (7 cols) */}
        <div
          className={`lg:col-span-7 rounded-3xl border p-5 sm:p-6 flex flex-col justify-between shadow-xl overflow-hidden transition-colors ${
            isDarkMode
              ? "border-slate-800 bg-slate-900/60 text-white"
              : "border-slate-200/90 bg-white text-slate-900"
          }`}
        >
          <div
            className={`border-b pb-4 flex items-center justify-between ${
              isDarkMode ? "border-slate-800" : "border-slate-100"
            }`}
          >
            <div>
              <span
                className={`text-[10px] font-black uppercase tracking-widest ${
                  isDarkMode ? "text-slate-400" : "text-slate-400"
                }`}
              >
                {isBn ? "সিরিয়ালে অপেক্ষমান" : "NEXT IN LINE"}
              </span>
              <h2
                className={`text-lg font-bold mt-0.5 ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                {isBn ? "পরবর্তী রোগীদের তালিকা" : "Upcoming Patient Queue"}
              </h2>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${
                isDarkMode
                  ? "bg-slate-800 border-slate-700 text-slate-300"
                  : "bg-slate-100 border-slate-200 text-slate-700"
              }`}
            >
              {upcomingQueue.length} {isBn ? "জন অপেক্ষায়" : "Waiting"}
            </span>
          </div>

          {/* Upcoming Tokens List */}
          <div className="py-4 space-y-2.5 overflow-y-auto flex-1 max-h-[380px]">
            {upcomingQueue.length === 0 ? (
              <div
                className={`h-full flex items-center justify-center text-center p-8 ${
                  isDarkMode ? "text-slate-500" : "text-slate-400"
                }`}
              >
                <div>
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p className="text-base font-semibold">
                    {isBn ? "বর্তমানে কোনো রোগী অপেক্ষায় নেই" : "No patients currently waiting"}
                  </p>
                  <p className="text-xs mt-1 opacity-70">
                    {isBn ? "আজকের সকল রোগী সম্পন্ন হয়েছে" : "Queue is all caught up for today"}
                  </p>
                </div>
              </div>
            ) : (
              upcomingQueue.slice(0, 7).map((p) => {
                const globalIndex = queue.findIndex((item) => item.id === p.id);
                const tokenStr = String(globalIndex + 1).padStart(2, "0");
                const isUrgent = p.priority === "high";

                return (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-2xl border transition flex items-center justify-between shadow-2xs ${
                      isDarkMode
                        ? "bg-slate-900/90 border-slate-800/80 hover:border-slate-700"
                        : "bg-slate-50/90 hover:bg-slate-100/90 border-slate-200/80"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`h-12 w-12 rounded-xl border flex flex-col items-center justify-center shrink-0 ${
                          isDarkMode
                            ? "bg-slate-950 border-slate-800"
                            : "bg-white border-slate-200 shadow-2xs"
                        }`}
                      >
                        <span
                          className={`text-[9px] uppercase font-bold ${
                            isDarkMode ? "text-slate-500" : "text-slate-400"
                          }`}
                        >
                          Token
                        </span>
                        <span className="text-lg font-black font-mono text-primary leading-none">
                          {tokenStr}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <p
                          className={`text-base font-bold truncate ${
                            isDarkMode ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {p.patient?.full_name ?? "Patient"}
                        </p>
                        <div
                          className={`flex items-center gap-2 text-xs mt-0.5 ${
                            isDarkMode ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          {p.walk_in ? (
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                isDarkMode
                                  ? "bg-amber-500/10 text-amber-400"
                                  : "bg-amber-100 text-amber-800 border border-amber-200"
                              }`}
                            >
                              Walk-in
                            </span>
                          ) : (
                            <span>{p.scheduled_time.slice(0, 5)}</span>
                          )}
                          <span>•</span>
                          <span>{p.waited_minutes}m wait</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isUrgent && (
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${
                            isDarkMode
                              ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                              : "bg-rose-100 text-rose-700 border border-rose-200"
                          }`}
                        >
                          <ShieldAlert className="h-3 w-3" /> Priority
                        </span>
                      )}
                      <button
                        onClick={() => onCallToken(tokenStr, p.patient?.full_name ?? "Patient")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1 ${
                          isDarkMode
                            ? "bg-slate-800 hover:bg-primary hover:text-primary-foreground text-slate-300 border-slate-700"
                            : "bg-white hover:bg-primary hover:text-white text-slate-700 border-slate-300 shadow-2xs"
                        }`}
                      >
                        <BellRing className="h-3 w-3" /> Call
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div
            className={`border-t pt-3 text-xs flex items-center justify-between ${
              isDarkMode ? "border-slate-800 text-slate-500" : "border-slate-100 text-slate-500"
            }`}
          >
            <span>{isBn ? "সিরিয়াল অনুযায়ী নাম ঘোষণা করা হবে" : "Tokens are called in sequence"}</span>
            <span className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
              {isBn ? "প্রয়োজনে সহকারীকে জানান" : "Contact reception for inquiries"}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Ticker & Stats Footer */}
      <div
        className={`rounded-2xl border p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs transition-colors ${
          isDarkMode
            ? "border-slate-800 bg-slate-900/80 text-slate-400"
            : "border-slate-200/90 bg-white text-slate-600 shadow-sm"
        }`}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider text-[11px] shrink-0">
            <CheckCircle2 className="h-4 w-4" />
            {isBn ? "রোগী নির্দেশিকা" : "PATIENT NOTICE"}:
          </span>
          <p className={`text-xs ${isDarkMode ? "text-slate-300" : "text-slate-700 font-medium"}`}>
            {isBn
              ? "দয়া করে আপনার পূর্ববর্তী প্রেসক্রিপশন ও সকল টেস্ট রিপোর্ট সাথে রাখুন। জরুরি রোগীদের অগ্রাধিকার দেওয়া হতে পারে।"
              : "Please keep your past prescriptions, medical history and test reports ready. Emergency cases receive medical priority."}
          </p>
        </div>

        <div className="flex items-center gap-5 sm:gap-6 font-mono shrink-0">
          <div>
            <span className={`text-[10px] uppercase font-bold mr-1 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
              Seen Today:
            </span>
            <span
              className={`font-bold text-sm ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}
            >
              {completedCount}
            </span>
          </div>
          <div>
            <span className={`text-[10px] uppercase font-bold mr-1 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
              Waiting:
            </span>
            <span className="text-primary font-bold text-sm">{upcomingQueue.length}</span>
          </div>
          <div>
            <span className={`text-[10px] uppercase font-bold mr-1 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
              Avg Wait:
            </span>
            <span className={`font-bold text-sm ${isDarkMode ? "text-amber-400" : "text-amber-600"}`}>
              {avgWaitMinutes}m
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
