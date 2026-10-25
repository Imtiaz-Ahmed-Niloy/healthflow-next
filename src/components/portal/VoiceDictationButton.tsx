"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Mic } from "lucide-react";
import { toast } from "sonner";

interface VoiceDictationButtonProps {
  onTranscript: (text: string) => void;
  defaultLang?: "bn-BD" | "en-US";
  size?: "default" | "sm" | "icon";
  className?: string;
  label?: string;
}

const STORAGE_KEY = "healthflow_voice_dictation_lang";
const LANG_EVENT = "healthflow_voice_lang_changed";

export function VoiceDictationButton({
  onTranscript,
  defaultLang = "bn-BD",
  className = "",
  label,
}: VoiceDictationButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [lang, setLang] = useState<"bn-BD" | "en-US">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "bn-BD" || saved === "en-US") return saved;
    }
    return defaultLang;
  });
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  isListeningRef.current = isListening;

  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const langRef = useRef(lang);
  langRef.current = lang;

  // Sync language changes across all instances on the page
  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<"bn-BD" | "en-US">;
      if (customEvent.detail && (customEvent.detail === "bn-BD" || customEvent.detail === "en-US")) {
        setLang(customEvent.detail);
      }
    };
    window.addEventListener(LANG_EVENT, handleSync);
    return () => window.removeEventListener(LANG_EVENT, handleSync);
  }, []);

  // Initialize SpeechRecognition instance
  const initRecognition = useCallback((targetLang: "bn-BD" | "en-US") => {
    if (typeof window === "undefined") return null;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = targetLang;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current]?.[0]?.transcript;
        if (transcript && transcript.trim()) {
          const text = transcript.trim();
          onTranscriptRef.current(text);
          toast.success(
            langRef.current === "bn-BD" ? `শ্রুত: "${text}"` : `Heard: "${text}"`,
            { duration: 1600 }
          );
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition event:", event.error);
        if (event.error !== "no-speech") {
          setIsListening(false);
          toast.error(
            langRef.current === "bn-BD"
              ? `ভয়েস রিকগনিশন ত্রুটি: ${event.error}`
              : `Voice recognition error: ${event.error}`
          );
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      return recognition;
    } catch (err) {
      console.warn("Speech recognition initialization error:", err);
      setIsSupported(false);
      return null;
    }
  }, []);

  useEffect(() => {
    recognitionRef.current = initRecognition(lang);
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [lang, initRecognition]);

  const startListeningWithLang = (targetLang: "bn-BD" | "en-US") => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    } catch {}

    const rec = initRecognition(targetLang);
    recognitionRef.current = rec;

    if (rec) {
      try {
        rec.start();
        setIsListening(true);
        toast.info(
          targetLang === "bn-BD"
            ? "কথা বলুন... বাংলায় ভয়েস টাইপিং চালু রয়েছে"
            : "Listening... English voice dictation active"
        );
      } catch (err) {
        console.error("Failed to start voice recognition:", err);
      }
    }
  };

  const toggleListening = () => {
    if (!isSupported) {
      toast.error("আপনার ব্রাউজারে স্পিচ রিকগনিশন সমর্থিত নয় (Chrome/Edge ব্যবহার করুন)");
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
    } else {
      startListeningWithLang(lang);
    }
  };

  const handleSwitchLang = (newLang: "bn-BD" | "en-US") => {
    if (newLang === lang) return;

    setLang(newLang);
    langRef.current = newLang;

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, newLang);
        window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: newLang }));
      } catch {}
    }

    toast.info(
      newLang === "bn-BD"
        ? "ভয়েস টাইপিং ভাষা: বাংলা (Bangla)"
        : "Voice typing language: English"
    );

    // If currently listening, seamlessly restart with the new language
    if (isListeningRef.current) {
      setTimeout(() => {
        startListeningWithLang(newLang);
      }, 50);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className={`inline-flex items-center rounded-full border border-slate-200/90 bg-white/95 p-0.5 shadow-2xs ${className}`}>
      {/* Microphone toggle button */}
      <button
        type="button"
        onClick={toggleListening}
        title={
          isListening
            ? "ভয়েস রেকর্ডিং বন্ধ করুন (Stop Dictation)"
            : `ভয়েস টাইপিং চালু করুন (${lang === "bn-BD" ? "বাংলা" : "English"})`
        }
        className={`flex items-center gap-1.5 ${isListening ? "px-2.5 py-1" : "p-1.5"} rounded-full text-xs font-semibold transition-all cursor-pointer ${
          isListening
            ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse shadow-xs"
            : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
        }`}
      >
        {isListening ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <Mic className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium">
              {lang === "bn-BD" ? "রেকর্ড হচ্ছে..." : "Listening..."}
            </span>
          </>
        ) : (
          <Mic className="h-3.5 w-3.5 text-emerald-600" />
        )}
      </button>

      {/* Dual Language Switcher: Bangla & English always accessible */}
      <div className="flex items-center rounded-full bg-slate-100 p-0.5 text-[10px] font-bold ml-0.5 border border-slate-200/60">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleSwitchLang("bn-BD");
          }}
          title="বাংলায় ভয়েস টাইপিং (Bangla Speech)"
          className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${
            lang === "bn-BD"
              ? "bg-emerald-600 text-white shadow-2xs font-bold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          বাং
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleSwitchLang("en-US");
          }}
          title="English Voice Typing"
          className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${
            lang === "en-US"
              ? "bg-emerald-600 text-white shadow-2xs font-bold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          EN
        </button>
      </div>
    </div>
  );
}
