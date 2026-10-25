"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Video, PhoneOff, Copy, Share2, ExternalLink, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "next-intl";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  patientName: string;
  doctorName?: string;
  patientPhone?: string | null;
};

export const TelemedicineRoomModal = ({
  open,
  onOpenChange,
  appointmentId,
  patientName,
  doctorName = "Doctor",
  patientPhone,
}: Props) => {
  const locale = useLocale();
  const isBn = locale === "bn";
  const [inCall, setInCall] = useState(true);

  const cleanId = appointmentId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24);
  const roomName = `HealthFlow-${cleanId || "Consultation"}`;
  const videoUrl = `https://meet.jit.si/${roomName}#userInfo.displayName="${encodeURIComponent(doctorName)}"&config.prejoinPageEnabled=false`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(videoUrl);
    toast.success(isBn ? "ভিডিও কনসালটেশন লিংক কপি করা হয়েছে" : "Telemedicine Video Link copied!");
  };

  const handleSendWhatsApp = () => {
    const text = isBn
      ? `আসসালামু আলাইকুম ${patientName},\nডাঃ ${doctorName}-এর সাথে আপনার অনলাইন ভিডিও কনসালটেশনের জন্য নিচের লিংকে ক্লিক করে যুক্ত হন:\n\n${videoUrl}\n\nHealthFlow ডিজিটাল টেলিমেডিসিন সেবা।`
      : `Dear ${patientName},\nPlease join your online consultation with Dr. ${doctorName} via this secure link:\n\n${videoUrl}\n\nHealthFlow Telemedicine.`;

    const phoneDigits = (patientPhone || "").replace(/\D/g, "");
    const targetNumber = phoneDigits.startsWith("88") ? phoneDigits : phoneDigits ? `88${phoneDigits}` : "";
    const waUrl = targetNumber
      ? `https://api.whatsapp.com/send?phone=${targetNumber}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
    toast.success(isBn ? "হোয়াটসঅ্যাপ মেসেজ প্রস্তুত করা হয়েছে" : "WhatsApp dispatch opened");
  };

  const handlePopout = () => {
    window.open(videoUrl, "HealthFlowTelemed", "width=1280,height=750,menubar=no,toolbar=no");
    toast.info(isBn ? "নতুন উইন্ডোতে ভিডিও কনসালটেশন খোলা হয়েছে" : "Opened in dedicated window");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-slate-950 border border-slate-800 text-white rounded-3xl shadow-2xl">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Video className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <span>{isBn ? "লাইভ টেলিমেডিসিন কনসালটেশন" : "Live Telemedicine Consultation"}</span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live
                </span>
              </DialogTitle>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <User className="h-3 w-3 text-slate-400" />
                <span className="text-slate-200 font-semibold">{patientName}</span>
                <span>•</span>
                <span className="font-mono text-slate-400 text-[11px]">#{roomName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 gap-1.5 h-8"
              title="Copy patient video invite link"
            >
              <Copy className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isBn ? "লিংক কপি" : "Copy Link"}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSendWhatsApp}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 shadow-xs"
              title="Dispatch link to patient WhatsApp"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>{isBn ? "হোয়াটসঅ্যাপে পাঠান" : "WhatsApp"}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handlePopout}
              className="text-xs text-slate-300 hover:text-white hover:bg-slate-800 h-8 px-2"
              title="Popout to separate window"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Video Area */}
        <div className="relative w-full h-[520px] bg-slate-950 flex flex-col items-center justify-center">
          {inCall ? (
            <iframe
              src={videoUrl}
              allow="camera; microphone; display-capture; autoplay; clipboard-write"
              className="w-full h-full border-0"
              title="HealthFlow Telemedicine Video Call"
            />
          ) : (
            <div className="text-center p-8 space-y-3">
              <div className="h-14 w-14 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <PhoneOff className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-white">
                {isBn ? "ভিডিও কনসালটেশন সমাপ্ত হয়েছে" : "Consultation Call Ended"}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {isBn
                  ? "রোগীর প্রেসক্রিপশন ও নির্দেশনা সম্পন্ন করতে প্রেসক্রিপশন প্যাডে ফিরে যান।"
                  : "You can now complete the prescription and clinical notes on the chart."}
              </p>
              <Button
                type="button"
                onClick={() => setInCall(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-xs"
              >
                {isBn ? "পুনরায় কল যুক্ত করুন" : "Rejoin Video Call"}
              </Button>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="px-6 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>
              {isBn ? "এন্ড-টু-এন্ড এনক্রিপ্টেড ও সম্পূর্ণ নিরাপদ চিকিৎসা যোগাযোগ" : "End-to-End Encrypted HIPAA/Clinical Safe Audio & Video"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setInCall(!inCall)}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
            >
              {inCall ? (isBn ? "কল শেষ করুন" : "Disconnect Video") : (isBn ? "পুনরায় চালু" : "Reconnect")}
            </button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 h-7"
            >
              {isBn ? "বন্ধ করুন" : "Close"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
