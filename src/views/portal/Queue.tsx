"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  CheckCircle2, Clock, ArrowRightLeft, Plus, SlidersHorizontal, ArrowRight, Check, MapPin,
  Monitor, BellRing, Eye, Search, Phone, Activity, Heart, ShieldAlert, Sparkles, User, UserCheck,
  ChevronDown, ExternalLink, Share2, Video, Coffee, Receipt
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { displayTime } from "@/lib/availability";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { rememberedPlace, rememberPlace } from "@/lib/rxPlace";
import { DateInput, DATE_INPUT_LOOK } from "@/components/ui/date-input";
import { PhoneInput } from "@/components/common/PhoneInput";
import { useListResourceQuery } from "@/redux/api/createResourceApi";
import type { PatientRow } from "@/redux/api/resources";
import { playSound } from "@/lib/audio";
import { useFormatters } from "@/lib/appSettings";
import { DoctorQueueTvDisplay } from "@/components/portal/DoctorQueueTvDisplay";
import { PatientQuickModal, type QuickPatientData } from "@/components/portal/PatientQuickModal";
import { TelemedicineRoomModal } from "@/components/portal/TelemedicineRoomModal";
import { OpdInvoiceModal, type WorkplaceFacility } from "@/components/portal/OpdInvoiceModal";
import { OpdInvoiceReceiptModal } from "@/components/portal/OpdInvoiceReceiptModal";

type Priority = "high" | "standard" | "routine";

type Hospital = { id: string; name: string };

/** The walk-in's patient_id when it is someone not yet on file under their number. */
const SOMEONE_ELSE = "new";

/** The phone box, styled like the shadcn inputs around it in the walk-in dialog. */
const WALK_IN_PHONE_LOOK = "h-10 rounded-md border border-input bg-background";

type ApiQueueEntry = {
  id: string;
  scheduled_time: string; // "10:30:00"
  priority: Priority;
  reason: string | null;
  walk_in?: boolean;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  in_consultation: boolean;
  waited_minutes: number;
  hospital: Hospital;
  patient: {
    id: string;
    mrn?: string;
    full_name: string;
    date_of_birth: string | null;
    phone: string | null;
    gender?: string | null;
    blood_group?: string | null;
    weight_kg?: number | null;
    height_feet?: number | null;
    height_inches?: number | null;
  } | null;
};

type ApiCompletedEntry = {
  id: string;
  scheduled_time: string;
  reason: string | null;
  walk_in?: boolean;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  hospital: Hospital;
  patient: {
    id: string;
    mrn?: string;
    full_name: string;
    date_of_birth: string | null;
    phone: string | null;
    gender?: string | null;
    blood_group?: string | null;
    weight_kg?: number | null;
    height_feet?: number | null;
    height_inches?: number | null;
  } | null;
};

type ApiQueueResponse = {
  queue: ApiQueueEntry[];
  completed: ApiCompletedEntry[];
  hospitals: Hospital[];
  stats: { seen: number; remaining: number; total: number; avg_wait_minutes: number };
};

type FilterKey = "ALL" | Priority;
const FILTERS: FilterKey[] = ["ALL", "high", "standard", "routine"];

const priorityMeta: Record<Priority, { priorityClass: string; dot: string }> = {
  high: { priorityClass: "bg-destructive/15 text-destructive", dot: "bg-destructive" },
  standard: { priorityClass: "bg-chip text-primary", dot: "bg-primary-glow" },
  routine: { priorityClass: "bg-muted text-foreground/60", dot: "bg-muted-foreground" },
};

/**
 * Their age from the date of birth — what a doctor glancing down the queue
 * wants, not the date itself. Years, or months and then days for a baby.
 */
const ageOf = (iso: string | null) => {
  if (!iso) return null;
  const dob = new Date(`${iso}T00:00:00`);
  const now = new Date();
  let months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  if (now.getDate() < dob.getDate()) months -= 1;
  if (months >= 12) return { unit: "years", count: Math.floor(months / 12) } as const;
  if (months >= 1) return { unit: "months", count: months } as const;
  return { unit: "days", count: Math.max(0, Math.floor((now.getTime() - dob.getTime()) / 86_400_000)) } as const;
};

const bloodGroupLabel = (bg: string | null | undefined) => {
  if (!bg) return null;
  return bg.replace("_positive", "+").replace("_negative", "-").toUpperCase();
};

const Queue = () => {
  const t = useTranslations("portal.queue");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isBn = locale === "bn";
  const formatTime = (time: string) => displayTime(time, locale);
  const ageLabel = (iso: string | null) => {
    const age = ageOf(iso);
    return age ? t(`ages.${age.unit}`, { count: age.count }) : "—";
  };
  const { formatCurrency } = useFormatters();
  const router = useRouter();

  const [queue, setQueue] = useState<ApiQueueEntry[]>([]);
  const [completed, setCompleted] = useState<ApiCompletedEntry[]>([]);
  const [stats, setStats] = useState<ApiQueueResponse["stats"]>({ seen: 0, remaining: 0, total: 0, avg_wait_minutes: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", dob: "", phone: "", reason: "", priority: "standard" as Priority, hospital_id: "", patient_id: "" });
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const multiHospital = hospitals.length > 1;

  // A full number is looked up at the walk-in's hospital: a returning patient
  // fills in by themselves, and a family sharing one number is a choice
  // between them. currentData, so a number's matches never show under the next.
  const walkInHospital = form.hospital_id || hospitals[0]?.id;
  const { currentData: phoneData, isFetching: lookingUp } = useListResourceQuery(
    { resource: "patients", limit: 20, filters: { phone: form.phone } },
    { skip: !walkInOpen || !form.phone },
  );
  const phoneMatches = form.phone
    ? ((phoneData?.data ?? []) as PatientRow[]).filter(p => p.tenant_id === walkInHospital)
    : [];
  const knownPatient = form.patient_id === SOMEONE_ELSE ? null
    : phoneMatches.find(p => p.id === form.patient_id) ?? (phoneMatches.length === 1 ? phoneMatches[0] : null);
  const pickingPatient = !knownPatient && phoneMatches.length > 1 && form.patient_id !== SOMEONE_ELSE;

  // TV mode state & Calling Token state
  const [tvDisplayMode, setTvDisplayMode] = useState(false);
  const [callingToken, setCallingToken] = useState<{ token: string; name: string; time: string; purpose?: string } | null>(null);
  const [quickPatient, setQuickPatient] = useState<QuickPatientData | null>(null);
  const [videoPatient, setVideoPatient] = useState<ApiQueueEntry | null>(null);
  const [breakEndsAt, setBreakEndsAt] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("healthflow_queue_break_ends_at");
        if (stored) {
          const parsed = Number(stored);
          if (parsed > Date.now()) return parsed;
          localStorage.removeItem("healthflow_queue_break_ends_at");
        }
      } catch {}
    }
    return null;
  });
  const [breakSecondsLeft, setBreakSecondsLeft] = useState<number>(0);

  // Doctor Info for TV header
  const [doctorInfo, setDoctorInfo] = useState<{
    name: string;
    specialty: string | null;
    education: string | null;
    bmdc_number?: string | null;
  } | null>(null);

  // OPD Invoice state
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [invoiceInitialData, setInvoiceInitialData] = useState<{
    patient_name?: string;
    patient_id?: string;
    patient_phone?: string;
    patient_mrn?: string;
    appointment_id?: string;
    tenant_id?: string;
  } | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);
  const [workplaces, setWorkplaces] = useState<WorkplaceFacility[]>([]);

  const effectiveWorkplaces: WorkplaceFacility[] = useMemo(() => {
    if (workplaces.length > 0) return workplaces;
    return hospitals.map(h => ({
      id: h.id,
      name: h.name,
      consultation_fee: 500,
    }));
  }, [workplaces, hospitals]);

  const handleOpenInvoiceModal = (entry: ApiQueueEntry | ApiCompletedEntry | QuickPatientData) => {
    setInvoiceInitialData({
      patient_name: entry.patient?.full_name || "",
      patient_id: entry.patient?.id,
      patient_phone: entry.patient?.phone || "",
      patient_mrn: entry.patient?.mrn || "",
      appointment_id: entry.id,
      tenant_id: entry.hospital?.id,
    });
    setInvoiceModalOpen(true);
  };

  const [receiptMode, setReceiptMode] = useState<"invoice" | "thermal">("invoice");

  const handleInvoiceCreated = (
    inv: any,
    shouldPrint?: boolean,
    mode: "invoice" | "thermal" = "invoice"
  ) => {
    setCreatedInvoice(inv);
    setReceiptMode(mode);
    if (shouldPrint) {
      setReceiptModalOpen(true);
    }
  };

  const load = async () => {
    try {
      const res = await fetch("/api/v1/portal/queue");
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error?.message || t("loadFailed"));
        return;
      }
      setQueue(body.data.queue ?? []);
      setCompleted(body.data.completed ?? []);
      const list: Hospital[] = body.data.hospitals ?? [];
      setHospitals(list);
      const here = rememberedPlace();
      if (here && list.some(h => h.id === here)) setForm(f => (f.hospital_id ? f : { ...f, hospital_id: here }));
      setStats(body.data.stats ?? { seen: 0, remaining: 0, total: 0, avg_wait_minutes: 0 });
    } catch {
      toast.error(tc("networkError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // Load workplaces and consultation fees for OPD invoicing
    fetch("/api/v1/portal/invoices")
      .then(res => res.json())
      .then(body => {
        if (body?.data?.workplaces) {
          setWorkplaces(body.data.workplaces);
        }
      })
      .catch(() => {});

    // Check if ?tv=1 or ?tv=true is in the URL to open TV Lounge mode immediately
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("tv") === "1" || sp.get("tv") === "true") {
        setTvDisplayMode(true);
      }
    }

    // Auto-refresh queue data every 25 seconds
    const pollInterval = setInterval(() => {
      void load();
    }, 25000);

    // Fetch doctor's identity for the TV screen & header
    fetch("/api/v1/portal/me")
      .then(res => (res.ok ? res.json() : null))
      .then(body => {
        if (body?.data) {
          setDoctorInfo({
            name: body.data.name,
            specialty: body.data.specialty,
            education: body.data.education,
            bmdc_number: body.data.bmdc_number,
          });
        }
      })
      .catch(() => {});

    // Listen for cross-tab token call broadcasts (e.g. from reception or another chamber window)
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("healthflow_queue_broadcast");
      channel.onmessage = (event) => {
        if (event.data?.type === "CALL_TOKEN" && event.data?.data) {
          setCallingToken(event.data.data);
        } else if (event.data?.type === "BREAK_START" && event.data?.data) {
          try {
            localStorage.setItem("healthflow_queue_break_ends_at", String(event.data.data.endsAt));
          } catch {}
          setBreakEndsAt(event.data.data.endsAt);
        } else if (event.data?.type === "BREAK_END") {
          try {
            localStorage.removeItem("healthflow_queue_break_ends_at");
          } catch {}
          setBreakEndsAt(null);
        } else if (event.data?.type === "QUEUE_REFRESH") {
          void load();
        }
      };
    } catch {}

    return () => {
      clearInterval(pollInterval);
      channel?.close();
    };
  }, []);

  // Sync live break timer countdown
  useEffect(() => {
    if (!breakEndsAt) {
      setBreakSecondsLeft(0);
      return;
    }
    const update = () => {
      const diff = Math.max(0, Math.round((breakEndsAt - Date.now()) / 1000));
      setBreakSecondsLeft(diff);
      if (diff <= 0) {
        setBreakEndsAt(null);
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [breakEndsAt]);

  // Place filter
  const [place, setPlace] = useState<string>("ALL");
  const inPlace = (entry: { hospital: Hospital }) => place === "ALL" || entry.hospital.id === place;

  // Search & Priority Filtered Queue
  const visible = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return queue.filter(p => {
      if (place !== "ALL" && p.hospital.id !== place) return false;
      if (filter !== "ALL" && p.priority !== filter) return false;
      if (!q) return true;
      const name = p.patient?.full_name?.toLowerCase() ?? "";
      const phone = p.patient?.phone?.toLowerCase() ?? "";
      const mrn = p.patient?.mrn?.toLowerCase() ?? "";
      const reason = p.reason?.toLowerCase() ?? "";
      return name.includes(q) || phone.includes(q) || mrn.includes(q) || reason.includes(q);
    });
  }, [queue, filter, place, searchQuery]);

  const completedHere = completed.filter(inPlace);

  const shownStats = (() => {
    if (place === "ALL") return stats;
    const waiting = queue.filter(inPlace);
    const notStarted = waiting.filter(p => !p.in_consultation);
    return {
      seen: completedHere.length,
      remaining: waiting.length,
      total: completedHere.length + waiting.length,
      avg_wait_minutes: notStarted.length
        ? Math.round(notStarted.reduce((sum, p) => sum + p.waited_minutes, 0) / notStarted.length)
        : 0,
    };
  })();

  // Calculate session completion percentage
  const sessionProgress = useMemo(() => {
    if (shownStats.total === 0) return 0;
    return Math.round((shownStats.seen / shownStats.total) * 100);
  }, [shownStats]);

  // Next up patient (first patient not currently in consultation)
  const nextUpPatient = useMemo(() => {
    return visible.find(p => !p.in_consultation);
  }, [visible]);

  const handleCallToken = (tokenStr: string, patientName: string, purpose?: string) => {
    const callData = {
      token: tokenStr,
      name: patientName,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      purpose,
    };
    setCallingToken(callData);

    // Broadcast across windows / monitors immediately
    try {
      const channel = new BroadcastChannel("healthflow_queue_broadcast");
      channel.postMessage({ type: "CALL_TOKEN", data: callData });
    } catch {}

    playSound("chime");

    // Browser speech synthesis if supported
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        const text = purpose === "vitals"
          ? (isBn
            ? `টোকেন নম্বর ${tokenStr}, ${patientName}, অনুগ্রহ করে ভাইটালস ও রক্তচাপ মাপার ডেস্কে আসুন`
            : `Token number ${tokenStr}, ${patientName}, please proceed for vitals and blood pressure check`)
          : (isBn
            ? `টোকেন নম্বর ${tokenStr}, ${patientName}, অনুগ্রহ করে ডাক্তারের চেম্বারে আসুন`
            : `Token number ${tokenStr}, ${patientName}, please enter doctor's consultation chamber`);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch {
        // speech fallback
      }
    }

    if (purpose === "vitals") {
      toast.success(
        isBn
          ? `টিভি বোর্ডে কল পাঠানো হয়েছে: টোকেন ${tokenStr} (${patientName}) - ভাইটালস ও বিপি মাপুন`
          : `Broadcasting Vitals Call on TV Board: Token ${tokenStr} (${patientName})`,
        { icon: "🩺" }
      );
    } else {
      toast.success(isBn ? `টোকেন ${tokenStr} কল করা হয়েছে` : `Calling Token ${tokenStr}`);
    }

    // Auto-dismiss calling banner after 12 seconds
    setTimeout(() => {
      setCallingToken(curr => (curr?.token === tokenStr ? null : curr));
    }, 12000);
  };

  const handleToggleBreak = (minutes = 10) => {
    try {
      const channel = new BroadcastChannel("healthflow_queue_broadcast");
      if (breakEndsAt && breakEndsAt > Date.now()) {
        try {
          localStorage.removeItem("healthflow_queue_break_ends_at");
        } catch {}
        channel.postMessage({ type: "BREAK_END" });
        channel.close();
        setBreakEndsAt(null);
        toast.success(
          isBn ? "বিরতি সমাপ্ত হয়েছে, ওপিডি পরামর্শ পুনরায় শুরু" : "Break ended, resuming OPD consultations",
          { icon: "▶️" }
        );
      } else {
        const targetEnd = Date.now() + minutes * 60 * 1000;
        try {
          localStorage.setItem("healthflow_queue_break_ends_at", String(targetEnd));
        } catch {}
        setBreakEndsAt(targetEnd);
        channel.postMessage({
          type: "BREAK_START",
          data: { minutes, endsAt: targetEnd },
        });
        channel.close();
        playSound("chime");
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          try {
            const text = isBn
              ? "সম্মানিত রোগীগণ, ডাক্তার ১০ মিনিটের সংক্ষিপ্ত বিরতিতে আছেন। অনুগ্রহ করে অপেক্ষা করুন।"
              : "Attention patients, the doctor is on a brief 10-minute break. Consultation will resume shortly.";
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.95;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
          } catch {}
        }
        toast.info(
          isBn ? "টিভি বোর্ডে ১০ মিনিটের বিরতি কাউন্টডাউন শুরু হয়েছে" : "10-minute break countdown active on TV board",
          { icon: "☕" }
        );
      }
    } catch {
      toast.info("১০ মিনিটের বিরতি সক্রিয় করা হয়েছে", { icon: "☕" });
    }
  };

  const handleAddWalkIn = async () => {
    const name = knownPatient?.full_name ?? form.name.trim();
    if (!name) {
      toast.error(pickingPatient ? t("pickPatient") : t("nameRequired"));
      return;
    }
    const hospitalId = form.hospital_id || hospitals[0]?.id;
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/portal/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: name,
          date_of_birth: (knownPatient ? knownPatient.date_of_birth : form.dob) || undefined,
          phone: form.phone || undefined,
          patient_id: knownPatient?.id,
          reason: form.reason.trim() || undefined,
          priority: form.priority,
          hospital_id: hospitalId || undefined,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error?.message || t("walkInFailed"));
        return;
      }
      toast.success(t("walkInAdded", { name }));
      setForm({ name: "", dob: "", phone: "", reason: "", priority: "standard", hospital_id: form.hospital_id, patient_id: "" });
      setWalkInOpen(false);
      void load();
    } catch {
      toast.error(tc("networkError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartConsult = async (entry: ApiQueueEntry) => {
    if (entry.in_consultation) {
      router.push(`/portal/prescription?appointment=${entry.id}`);
      return;
    }

    setStartingId(entry.id);
    try {
      const res = await fetch("/api/v1/portal/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error?.message || t("startFailed"));
        return;
      }
      router.push(`/portal/prescription?appointment=${entry.id}`);
    } catch {
      toast.error(tc("networkError"));
    } finally {
      setStartingId(null);
    }
  };

  const currentChamberName = useMemo(() => {
    if (place === "ALL") return hospitals[0]?.name;
    return hospitals.find(h => h.id === place)?.name;
  }, [place, hospitals]);

  // Full-screen Lounge TV Display Mode
  if (tvDisplayMode) {
    return (
      <DoctorQueueTvDisplay
        queue={visible}
        completedCount={completedHere.length}
        avgWaitMinutes={shownStats.avg_wait_minutes}
        doctorName={doctorInfo?.name}
        doctorSpecialty={doctorInfo?.specialty}
        doctorEducation={doctorInfo?.education}
        chamberName={currentChamberName}
        callingToken={callingToken}
        initialBreakEndsAt={breakEndsAt}
        onCallToken={handleCallToken}
        onClose={() => setTvDisplayMode(false)}
        onRefresh={load}
      />
    );
  }

  const statCards = [
    { label: t("stats.seen"), value: String(shownStats.seen), suffix: `/ ${shownStats.total}`, icon: CheckCircle2 },
    { label: t("stats.avgWait"), value: String(shownStats.avg_wait_minutes), suffix: t("stats.mins"), icon: Clock },
    { label: t("stats.remaining"), value: String(shownStats.remaining), suffix: t("stats.appointments"), icon: ArrowRightLeft },
  ];

  const handleCopyTvLink = () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/portal/queue?tv=1`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success(isBn ? "টিভি ডিসপ্লে লিঙ্ক কপি করা হয়েছে" : "Lounge TV Screen URL copied to clipboard");
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };

  const handlePopoutTv = () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/portal/queue?tv=1`;
    window.open(url, "HealthFlowLoungeTv", "width=1280,height=720,menubar=no,toolbar=no,location=no,status=no");
    toast.info(isBn ? "নতুন উইন্ডোতে টিভি স্ক্রিন চালু হয়েছে" : "Opened Lounge TV in dedicated window");
  };

  return (
    <PortalLayout>
      {/* Top Header Bar */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-4xl text-primary">{t("title")}</h1>
            <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
              OPD Token Desk
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString(isBn ? "bn-BD-u-nu-latn" : "en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Lounge TV Screen Action Popover */}
          <Popover>
            <div className="flex items-center rounded-full border border-primary/30 bg-primary/5 text-primary shadow-xs overflow-hidden">
              <button
                onClick={() => {
                  setTvDisplayMode(true);
                  toast.info(isBn ? "লাউঞ্জ টিভি স্ক্রিন সক্রিয় হয়েছে" : "Lounge TV Display Activated");
                }}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold hover:bg-primary/15 transition-all"
                title="Open Waiting Hall / Lounge TV Screen"
              >
                <Monitor className="h-4 w-4 text-primary" />
                <span>{isBn ? "লাউঞ্জ টিভি ডিসপ্লে" : "Lounge TV Board"}</span>
              </button>
              <PopoverTrigger asChild>
                <button
                  className="px-2 py-2.5 border-l border-primary/20 hover:bg-primary/15 transition-colors"
                  title="TV Screen Options"
                >
                  <ChevronDown className="h-3.5 w-3.5 text-primary" />
                </button>
              </PopoverTrigger>
            </div>
            <PopoverContent align="end" className="w-64 p-2">
              <p className="text-[10px] tracking-widest font-bold text-muted-foreground px-2 py-1.5 uppercase">
                {isBn ? "টিভি স্ক্রিন অপশন" : "Lounge TV Options"}
              </p>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setTvDisplayMode(true)}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-primary hover:bg-chip transition text-left"
                >
                  <Monitor className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p>{isBn ? "এই ট্যাবে টিভি স্ক্রিন চালু করুন" : "Open Fullscreen in Tab"}</p>
                    <p className="text-[10px] text-muted-foreground font-normal">{isBn ? "ফুলস্ক্রিন মোড" : "Standard Lounge Overlay"}</p>
                  </div>
                </button>

                <button
                  onClick={handlePopoutTv}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-primary hover:bg-chip transition text-left"
                >
                  <ExternalLink className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p>{isBn ? "আলাদা উইন্ডোতে চালু করুন" : "Pop-out to New Window"}</p>
                    <p className="text-[10px] text-muted-foreground font-normal">{isBn ? "দ্বিতীয় মনিটর বা টিভির জন্য" : "For Secondary TV / HDMI screen"}</p>
                  </div>
                </button>

                <button
                  onClick={handleCopyTvLink}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-primary hover:bg-chip transition text-left"
                >
                  <Share2 className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p>{isBn ? "টিভি ডিসপ্লে লিঙ্ক কপি করুন" : "Copy Live TV Screen URL"}</p>
                    <p className="text-[10px] text-muted-foreground font-normal">{isBn ? "অন্য ডিভাইসে ওপেন করার জন্য" : "Share with waiting room smart TV"}</p>
                  </div>
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Hospital / Chamber Filter */}
          {multiHospital && (
            <Select value={place} onValueChange={v => {
              setPlace(v);
              if (v !== "ALL") setForm(f => ({ ...f, hospital_id: v }));
            }}>
              <SelectTrigger className="h-auto w-auto min-w-[12rem] gap-2 rounded-full border-border px-5 py-2.5 text-xs font-semibold text-primary">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("allPlaces")}</SelectItem>
                {hospitals.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {/* Priority Filter Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-xs font-semibold text-primary hover:bg-chip transition-colors">
                <SlidersHorizontal className="h-3.5 w-3.5" /> {t("filterView")}
                {filter !== "ALL" && <span className="ml-1 rounded-full bg-primary text-primary-foreground text-[10px] px-2 py-0.5">1</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2">
              <p className="text-[10px] tracking-widest font-bold text-muted-foreground px-2 py-1.5">{t("filterByPriority")}</p>
              <div className="flex flex-col">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setFilter(f);
                      toast.info(f === "ALL" ? t("showingAll") : t("filtered", { priority: t(`priority.${f}`) }));
                    }}
                    className="flex items-center justify-between rounded-md px-2 py-2 text-xs text-primary hover:bg-chip transition-colors"
                  >
                    <span>{f === "ALL" ? t("allPatients") : t(`priority.${f}`)}</span>
                    {filter === f && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Add Walk-In Patient Dialog */}
          <Dialog open={walkInOpen} onOpenChange={(o) => !submitting && setWalkInOpen(o)}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-1.5 rounded-full bg-gradient-dark text-surface-dark-foreground px-4 py-2.5 text-xs font-semibold hover:opacity-90 shadow-glow">
                <Plus className="h-4 w-4" /> {t("walkIn")}
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl text-primary">{t("addWalkIn")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {multiHospital && (
                  <div className="space-y-1.5">
                    <Label>{t("where")}</Label>
                    <Select value={form.hospital_id || hospitals[0]?.id} onValueChange={(v) => { rememberPlace(v); setForm({ ...form, hospital_id: v, patient_id: "" }); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {hospitals.map((h) => (
                          <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>{t("phone")}</Label>
                  {/* Hands back "" until the number is complete, so only a full one is looked up. */}
                  <PhoneInput defaultValue={form.phone} onChange={phone => setForm({ ...form, phone, patient_id: "" })} className={WALK_IN_PHONE_LOOK} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="name">{t("patientName")}</Label>
                  {knownPatient ? (
                    <Input id="name" value={knownPatient.full_name} readOnly tabIndex={-1} className="opacity-70 cursor-not-allowed" />
                  ) : pickingPatient ? (
                    <Select value="" onValueChange={(v) => setForm({ ...form, patient_id: v })}>
                      <SelectTrigger id="name"><SelectValue placeholder={t("pickPatient")} /></SelectTrigger>
                      <SelectContent>
                        {phoneMatches.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                        <SelectItem value={SOMEONE_ELSE}>{t("someoneElse")}</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder={lookingUp ? t("lookingUp") : t("namePlaceholder")} />
                  )}
                  {knownPatient && (
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      {t("onFile")}
                      <button type="button" onClick={() => setForm({ ...form, patient_id: SOMEONE_ELSE })}
                        className="font-semibold text-primary underline-offset-4 hover:underline">
                        {t("someoneElse")}
                      </button>
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dob">{t("dob")}</Label>
                  {/* A returning patient's own, as on file; the server keeps their record as it is. */}
                  <DateInput key={knownPatient?.id ?? "typed"} id="dob" value={knownPatient ? knownPatient.date_of_birth ?? "" : form.dob}
                    onChange={dob => setForm({ ...form, dob })} disabled={!!knownPatient}
                    max={new Date().toISOString().split("T")[0]} className={DATE_INPUT_LOOK} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reason">{t("reasonLabel")} <span className="text-muted-foreground font-normal">{t("optional")}</span></Label>
                  <Input id="reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder={t("reasonPlaceholder")} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("priorityLabel")}</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Priority })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">{t("priority.high")}</SelectItem>
                      <SelectItem value="standard">{t("priority.standard")}</SelectItem>
                      <SelectItem value="routine">{t("priority.routine")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <button onClick={() => setWalkInOpen(false)} disabled={submitting} className="rounded-full border border-border px-5 py-2.5 text-xs font-semibold text-primary hover:bg-chip transition-colors">{tc("cancel")}</button>
                <button onClick={handleAddWalkIn} disabled={submitting} className="rounded-full bg-gradient-dark text-surface-dark-foreground px-5 py-2.5 text-xs font-semibold hover:opacity-90 shadow-glow disabled:opacity-60">
                  {submitting ? t("adding") : t("addToQueue")}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* OPD Session Progress & Stats Cards */}
      <div className="grid md:grid-cols-3 gap-5 mt-7">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.08 }}
            className="rounded-2xl bg-card border border-border/60 p-5 flex items-center justify-between shadow-soft">
            <div>
              <p className="text-[10px] tracking-widest font-bold text-muted-foreground uppercase">{s.label}</p>
              <p className="mt-1"><span className="font-display text-3xl text-primary">{s.value}</span> <span className="text-xs text-muted-foreground ml-1">{s.suffix}</span></p>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-chip/60 border border-border/50 flex items-center justify-center text-primary"><s.icon className="h-5 w-5" /></div>
          </motion.div>
        ))}
      </div>

      {/* Quick Chamber Intercom Signals */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 bg-slate-50/90 border border-slate-200/90 rounded-2xl p-2.5 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 pl-1">
            <BellRing className="h-3.5 w-3.5 text-slate-500" /> {isBn ? "চেম্বার ইন্টারকম:" : "Chamber Intercom:"}
          </span>
          <button
            type="button"
            onClick={() => {
              if (visible.length > 0) {
                const first = visible[0];
                const tokenStr = String(queue.findIndex(item => item.id === first.id) + 1).padStart(2, "0");
                handleCallToken(tokenStr, first.patient?.full_name ?? "Patient");
              } else {
                toast.success(isBn ? "সংকেত পাঠানো হয়েছে: পরবর্তী রোগীকে পাঠান" : "Signal sent: Call next patient");
              }
            }}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/50 transition-all shadow-2xs"
          >
            {isBn ? "পরবর্তী রোগী ডাকুন" : "Call Next Patient"}
          </button>
          <button
            type="button"
            onClick={() => {
              const target = nextUpPatient || (visible.length > 0 ? visible[0] : null);
              if (target) {
                const tokenStr = String(queue.findIndex(item => item.id === target.id) + 1).padStart(2, "0");
                handleCallToken(tokenStr, target.patient?.full_name ?? "Patient", "vitals");
              } else {
                handleCallToken("01", isBn ? "পরবর্তী রোগী" : "Next Patient", "vitals");
              }
            }}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50/50 transition-all shadow-2xs"
          >
            {isBn ? "ভাইটালস ও বিপি মাপুন" : "Check Vitals & BP"}
          </button>
          <button
            type="button"
            onClick={() => handleToggleBreak(10)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shadow-2xs ${
              breakEndsAt && breakEndsAt > Date.now()
                ? "bg-amber-100 border border-amber-400 text-amber-900 font-bold animate-pulse hover:bg-amber-200"
                : "bg-white border border-slate-200 text-slate-700 hover:border-amber-500 hover:text-amber-700 hover:bg-amber-50/50"
            }`}
          >
            {breakEndsAt && breakEndsAt > Date.now()
              ? `${isBn ? "বিরতি চলছে" : "On Break"} (${Math.floor(breakSecondsLeft / 60)}:${String(breakSecondsLeft % 60).padStart(2, "0")}) • ${isBn ? "শেষ করুন" : "End"}`
              : isBn ? "১০ মিনিট বিরতি" : "10m Break"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/portal/invoices"
            className="text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-2.5 py-1 transition-all shadow-2xs flex items-center gap-1"
          >
            <Receipt className="h-3 w-3 text-emerald-600" />
            {isBn ? "ওপিডি বিল" : "OPD Invoices"}
          </Link>
          <Link
            href="/portal/earnings"
            className="text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 transition-all shadow-2xs flex items-center"
          >
            {isBn ? "আয় বিবরণী" : "View Earnings"}
          </Link>
        </div>
      </div>

      {/* Session Progress Bar */}
      {shownStats.total > 0 && (
        <div className="mt-4 p-4 rounded-2xl bg-card border border-border/60 shadow-2xs">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-primary flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-primary" />
              {isBn ? "আজকের ওপিডি সেশন অগ্রগতি" : "Today's OPD Session Completion"}
            </span>
            <span className="font-mono font-bold text-primary">
              {sessionProgress}% ({shownStats.seen} of {shownStats.total} {isBn ? "দেখা হয়েছে" : "seen"})
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-chip overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${sessionProgress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow"
            />
          </div>
        </div>
      )}

      {/* Up Next Spotlight Card (if patients waiting) */}
      {nextUpPatient && !nextUpPatient.in_consultation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-chip/40 via-card to-chip/20 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center font-display text-primary shrink-0">
              <span className="text-[8px] font-bold uppercase text-muted-foreground">Up Next</span>
              <span className="text-sm font-black leading-none">
                {String(queue.findIndex(item => item.id === nextUpPatient.id) + 1).padStart(2, "0")}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-primary">{nextUpPatient.patient?.full_name}</span>
                {nextUpPatient.priority === "high" && (
                  <span className="px-2 py-0.2 rounded-full bg-rose-500/10 text-rose-500 text-[9px] font-bold">
                    Urgent
                  </span>
                )}
                {nextUpPatient.patient?.blood_group && (
                  <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary text-[9px] font-bold">
                    {bloodGroupLabel(nextUpPatient.patient.blood_group)}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {nextUpPatient.waited_minutes}m waiting • {nextUpPatient.reason || "General Consultation"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleCallToken(String(queue.findIndex(item => item.id === nextUpPatient.id) + 1).padStart(2, "0"), nextUpPatient.patient?.full_name ?? "Patient")}
              className="px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 text-xs font-semibold flex items-center gap-1 transition"
            >
              <BellRing className="h-3.5 w-3.5" /> Call Token
            </button>
            <button
              type="button"
              onClick={() => handleOpenInvoiceModal(nextUpPatient)}
              className="px-3 py-1.5 rounded-full border border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1 transition"
              title={isBn ? "ওপিডি বিল তৈরি করুন" : "Generate OPD Invoice"}
            >
              <Receipt className="h-3.5 w-3.5 text-emerald-600" /> {isBn ? "বিল" : "Bill"}
            </button>
            <button
              onClick={() => handleStartConsult(nextUpPatient)}
              className="px-4 py-1.5 rounded-full bg-gradient-dark text-surface-dark-foreground text-xs font-semibold hover:opacity-90 shadow-glow flex items-center gap-1"
            >
              Start Consult <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Main Queue Section */}
      <div className="mt-8">
        {/* Search & Filter Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="h-5 w-1 rounded-full bg-primary-glow" />
            <h2 className="font-display text-xl text-primary">{t("waiting")}</h2>
            <span className="rounded-full bg-chip text-primary text-xs font-bold px-2.5 py-0.5">
              {visible.length}
            </span>
          </div>

          {/* Quick Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isBn ? "নাম, ফোন বা MRN দিয়ে খুঁজুন..." : "Search name, phone, MRN..."}
              className="h-8 text-xs pl-8 rounded-full"
            />
          </div>
        </div>

        {/* Patient Queue Cards List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl bg-card border border-border/60 p-8 text-center text-sm text-muted-foreground">
              {queue.length === 0
                ? t("noneToday")
                : place !== "ALL" && !queue.some(inPlace)
                  ? t("noneHere", { place: hospitals.find(h => h.id === place)?.name ?? t("thisPlace") })
                  : t("noneMatch")}
            </div>
          ) : (
            visible.map((p) => {
              const globalIndex = queue.findIndex(item => item.id === p.id);
              const tokenStr = String(globalIndex + 1).padStart(2, "0");
              const meta = priorityMeta[p.priority];
              const pt = p.patient;
              const hasVitals = p.bp_systolic && p.bp_diastolic;

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  whileHover={{ y: -1 }}
                  className={`rounded-2xl border p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-all shadow-soft ${
                    p.in_consultation
                      ? "bg-primary/5 border-primary shadow-glow"
                      : "bg-card border-border/60 hover:border-border"
                  }`}
                >
                  {/* Left Patient ID & Identity */}
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Token Number Box */}
                    <div className="relative shrink-0">
                      <div className="h-14 w-14 rounded-2xl bg-chip/80 border border-border/50 flex flex-col items-center justify-center font-display text-primary shadow-xs">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Token</span>
                        <span className="text-xl font-black leading-none text-primary">{tokenStr}</span>
                      </div>
                      <span className={`absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-card ${p.in_consultation ? "bg-primary-glow animate-pulse" : meta.dot}`} />
                    </div>

                    {/* Patient Main Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-primary truncate">
                          {pt?.full_name ?? t("patient")}
                        </p>
                        {pt?.mrn && (
                          <span className="text-[11px] font-mono text-muted-foreground font-semibold">
                            #{pt.mrn}
                          </span>
                        )}
                        {pt?.blood_group && (
                          <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary text-[10px] font-bold">
                            {bloodGroupLabel(pt.blood_group)}
                          </span>
                        )}
                        {p.walk_in && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold border border-amber-500/20">
                            Walk-in
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                        <span>{ageLabel(pt?.date_of_birth ?? null)}</span>
                        {pt?.gender && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{pt.gender}</span>
                          </>
                        )}
                        {pt?.phone && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{pt.phone}</span>
                          </>
                        )}
                        {multiHospital && (
                          <>
                            <span>•</span>
                            <span className="font-semibold text-primary-glow">{p.hospital.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle Clinical & Timing Details */}
                  <div className="flex items-center gap-5 flex-wrap text-xs text-muted-foreground">
                    {/* Vitals Pill */}
                    {hasVitals && (
                      <div className="p-2 rounded-xl bg-chip/60 border border-border/50 flex items-center gap-2 text-primary">
                        <Heart className="h-3.5 w-3.5 text-rose-500" />
                        <span className="font-mono font-bold">{p.bp_systolic}/{p.bp_diastolic}</span>
                        <span className="text-[10px] text-muted-foreground">mmHg</span>
                      </div>
                    )}

                    {/* Stated Reason */}
                    {p.reason && (
                      <div className="hidden xl:block max-w-[200px] truncate text-foreground/80">
                        <span className="text-muted-foreground font-medium mr-1">{t("reason")}:</span>
                        <span>{p.reason}</span>
                      </div>
                    )}

                    {/* Waiting time pill */}
                    <div className="text-right">
                      {p.in_consultation ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20 flex items-center gap-1 animate-pulse">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          {isBn ? "চেম্বারে চলমান" : "In Chamber"}
                        </span>
                      ) : (
                        <span className={`text-xs font-medium ${p.waited_minutes > 30 ? "text-rose-500 font-semibold" : ""}`}>
                          {p.waited_minutes > 0 ? t("waitingFor", { minutes: p.waited_minutes }) : t("waitingLabel")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Actions Toolbar */}
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-0 border-border/40">
                    {/* Call Token Button */}
                    <button
                      onClick={() => handleCallToken(tokenStr, pt?.full_name ?? "Patient")}
                      className="p-2 rounded-full border border-border hover:border-primary/40 text-foreground/70 hover:text-primary hover:bg-chip transition"
                      title={isBn ? "টোকেন কল করুন (টিভি স্ক্রিনে ঘোষণা)" : "Broadcast Call on TV Screen"}
                    >
                      <BellRing className="h-3.5 w-3.5" />
                    </button>

                    {/* Quick View Button */}
                    <button
                      onClick={() => setQuickPatient({ ...p, tokenNo: tokenStr })}
                      className="p-2 rounded-full border border-border hover:border-primary/40 text-foreground/70 hover:text-primary hover:bg-chip transition"
                      title={isBn ? "রোগীর বিবরণ" : "Quick Patient Details"}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>

                    {/* Telemedicine Video Button */}
                    <button
                      onClick={() => setVideoPatient(p)}
                      className="p-2 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition shadow-2xs"
                      title={isBn ? "ভিডিও কনসালটেশন শুরু করুন" : "Start Video Consultation"}
                    >
                      <Video className="h-3.5 w-3.5" />
                    </button>

                    {/* Quick OPD Invoice Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenInvoiceModal(p)}
                      className="p-2 rounded-full border border-border hover:border-emerald-500/50 text-foreground/70 hover:text-emerald-700 hover:bg-emerald-50 transition"
                      title={isBn ? "ওপিডি ইনভয়েস / বিল তৈরি করুন" : "Generate OPD Invoice / Bill"}
                    >
                      <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                    </button>

                    {/* Start / Resume Consultation Action */}
                    <button
                      onClick={() => handleStartConsult(p)}
                      disabled={startingId === p.id}
                      className="flex items-center gap-1.5 rounded-full bg-gradient-dark text-surface-dark-foreground px-4 py-2 text-xs font-semibold hover:opacity-90 shadow-glow disabled:opacity-60 transition"
                    >
                      {startingId === p.id
                        ? t("starting")
                        : p.in_consultation
                          ? (isBn ? "পরামর্শে ফিরে যান" : t("inConsult"))
                          : (isBn ? "পরামর্শ শুরু" : t("startConsult"))}
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Completed Patients Section */}
      {!loading && completedHere.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-5 w-1 rounded-full bg-muted-foreground/40" />
            <h2 className="font-display text-xl text-primary">{t("seenToday")}</h2>
            <span className="rounded-full bg-muted text-muted-foreground text-xs font-bold px-2.5 py-0.5">
              {completedHere.length}
            </span>
          </div>
          <div className="space-y-2.5">
            {completedHere.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: i * 0.04 }}
                className="rounded-2xl bg-card/60 border border-border/40 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-chip/60 border border-border/40 flex items-center justify-center font-display text-xs text-muted-foreground shrink-0 font-bold">
                    ✓
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-primary truncate">{p.patient?.full_name ?? t("patient")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ageLabel(p.patient?.date_of_birth ?? null)} • {p.patient?.phone || "No phone"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium mr-1">{t("time")}:</span>
                    <span className="font-semibold text-primary">{formatTime(p.scheduled_time)}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold text-[10px]">
                    Completed
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenInvoiceModal(p)}
                    className="flex items-center gap-1 rounded-full border border-emerald-300/80 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 px-3 py-1.5 text-xs font-semibold transition-colors"
                    title={isBn ? "ওপিডি ইনভয়েস / রসিদ তৈরি বা প্রিন্ট করুন" : "Generate OPD Receipt / Bill"}
                  >
                    <Receipt className="h-3 w-3 text-emerald-600" />
                    <span>{isBn ? "বিল" : "Invoice"}</span>
                  </button>
                  <Link href={`/portal/prescription?appointment=${p.id}`}
                    className="flex items-center gap-1 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-chip transition-colors">
                    {t("view")} <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Patient Quick Details Modal */}
      <PatientQuickModal
        patient={quickPatient}
        open={!!quickPatient}
        onOpenChange={(open) => !open && setQuickPatient(null)}
        onStartConsult={(p) => {
          setQuickPatient(null);
          handleStartConsult(p as ApiQueueEntry);
        }}
        onCallToken={(tok, name) => handleCallToken(tok, name)}
        onCreateInvoice={(p) => {
          setQuickPatient(null);
          handleOpenInvoiceModal(p);
        }}
        ageLabel={ageLabel}
      />

      {/* Telemedicine Video Room Modal */}
      {videoPatient && (
        <TelemedicineRoomModal
          open={!!videoPatient}
          onOpenChange={(open) => !open && setVideoPatient(null)}
          appointmentId={videoPatient.id}
          patientName={videoPatient.patient?.full_name || "Patient"}
          doctorName={doctorInfo?.name}
          patientPhone={videoPatient.patient?.phone}
        />
      )}

      {/* OPD Invoice Creation Modal */}
      <OpdInvoiceModal
        open={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        workplaces={effectiveWorkplaces}
        initialData={invoiceInitialData}
        onInvoiceCreated={handleInvoiceCreated}
        formatTk={formatCurrency}
      />

      {/* OPD Invoice Printable Receipt Slip Modal */}
      <OpdInvoiceReceiptModal
        open={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        invoice={createdInvoice}
        doctorName={doctorInfo?.name}
        initialMode={receiptMode}
        formatTk={formatCurrency}
      />
    </PortalLayout>
  );
};

export default Queue;
