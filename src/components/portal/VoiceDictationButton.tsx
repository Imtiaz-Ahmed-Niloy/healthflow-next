"use client";

import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { toast } from "sonner";

interface VoiceDictationButtonProps {
  onTranscript: (text: string) => void;
  /** The words heard so far, while dictating; "" once the session ends. */
  onPreview?: (text: string) => void;
  defaultLang?: "bn-BD" | "en-US";
  size?: "default" | "sm" | "icon";
  className?: string;
  label?: string;
}

const STORAGE_KEY = "healthflow_voice_dictation_lang";
const LANG_EVENT = "healthflow_voice_lang_changed";

/**
 * The Web Speech API is not in TypeScript's DOM lib and is still vendor
 * prefixed in Chrome. Only the members this component touches are declared.
 */
type SpeechResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
};

type SpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
};

const getRecognitionCtor = () => {
  if (typeof window === "undefined") return undefined;
  const w = window as SpeechWindow;
  return w.SpeechRecognition || w.webkitSpeechRecognition;
};

/** How long without new words before what was said is added as an item; the mic keeps listening. */
const SILENCE_MS = 1500;

// Mobile Chrome and Safari break continuous mode: each pause re-sends the
// whole utterance so far as a new final result. One phrase per engine run there.
const isMobile = () =>
  typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();

/**
 * Joins result segments into one sentence. A segment that repeats the one
 * before it and carries on ("drink", "drink more", "drink more water")
 * replaces it instead of being appended, which is how the mobile engines
 * deliver a growing utterance.
 */
const mergeSegments = (segments: string[]) =>
  segments
    .reduce<string[]>((out, raw) => {
      const seg = raw.trim();
      if (!seg) return out;
      const prev = out[out.length - 1];
      if (prev !== undefined) {
        if (normalize(seg).startsWith(normalize(prev))) {
          out[out.length - 1] = seg;
          return out;
        }
        if (normalize(prev).startsWith(normalize(seg))) return out;
      }
      out.push(seg);
      return out;
    }, [])
    .join(" ");

/** Ends a session without committing what it heard. */
const discardSession = (rec: SpeechRecognition | null) => {
  if (!rec) return;
  rec.onresult = null;
  rec.onerror = null;
  rec.onend = null;
  try {
    rec.abort();
  } catch {}
};

export function VoiceDictationButton({
  onTranscript,
  onPreview,
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

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Ends the running dictation and adds what it heard.
  const finishRef = useRef<(() => void) | null>(null);
  const isListeningRef = useRef(false);
  isListeningRef.current = isListening;

  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const onPreviewRef = useRef(onPreview);
  onPreviewRef.current = onPreview;

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

  useEffect(() => {
    if (!getRecognitionCtor()) setIsSupported(false);
    return () => {
      discardSession(recognitionRef.current);
      recognitionRef.current = null;
      finishRef.current = null;
    };
  }, []);

  /**
   * A session listens until the button is tapped (or the mic fails). Each
   * SILENCE_MS without new words closes the current item: what was said since
   * the last one goes to onTranscript and the next words start a new one.
   * Shorter gaps stay in the same item. When the engine stops on its own (on
   * phones, after every phrase) it is started again. Interim words show
   * through onPreview meanwhile.
   */
  const startListeningWithLang = (targetLang: "bn-BD" | "en-US") => {
    const Recognition = getRecognitionCtor();
    if (!Recognition) {
      setIsSupported(false);
      return;
    }

    discardSession(recognitionRef.current);
    recognitionRef.current = null;
    finishRef.current = null;
    onPreviewRef.current?.("");

    const rec = new Recognition();
    rec.continuous = !isMobile();
    rec.interimResults = true;
    rec.lang = targetLang;

    // The current item's phrases from engine runs that have already ended.
    const pending: string[] = [];
    // The current run. Every event carries all of its results, so this is
    // rebuilt from them each time rather than appended to. Results before
    // `consumed` already went into an earlier item.
    let finalText = "";
    let fullText = "";
    let consumed = 0;
    let seen = 0;
    let stopping = false;
    let silenceTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      stopping = true;
      clearTimeout(silenceTimer);
      try {
        rec.stop();
      } catch {}
    };

    /** Adds what was said since the last item as one item, and starts the next. */
    const closeItem = () => {
      // Mid-run the last words may still be interim, so they count too.
      const text = [...pending, fullText].join(" ").trim();
      pending.length = 0;
      consumed = seen;
      finalText = "";
      fullText = "";
      onPreviewRef.current?.("");
      if (text) onTranscriptRef.current(text);
    };

    const restartSilenceTimer = () => {
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        if (recognitionRef.current === rec) closeItem();
      }, SILENCE_MS);
    };

    rec.onresult = (event) => {
      const finals: string[] = [];
      const all: string[] = [];
      for (let i = consumed; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        all.push(transcript);
        if (result.isFinal) finals.push(transcript);
      }
      seen = event.results.length;
      finalText = mergeSegments(finals);
      fullText = mergeSegments(all);
      // A late update to words already added changes nothing here.
      if (!fullText && pending.length === 0) return;
      restartSilenceTimer();
      onPreviewRef.current?.([...pending, fullText].join(" ").trim());
    };

    rec.onerror = (event) => {
      // A run that heard nothing just ends and is started again.
      if (event.error === "no-speech") return;
      // Anything else would fail again on restart. "aborted" here means another
      // dictation on the page took the mic (a discarded session has no handlers).
      stopping = true;
      if (event.error === "aborted") return;
      console.warn("Speech recognition event:", event.error);
      toast.error(
        langRef.current === "bn-BD"
              ? `ভয়েস রিকগনিশন ত্রুটি: ${event.error}`
          : `Voice recognition error: ${event.error}`
      );
    };

    rec.onend = () => {
      // Stopping can end a run before its last words turn final.
      const heard = (finalText || fullText).trim();
      if (heard) pending.push(heard);
      finalText = "";
      fullText = "";
      consumed = 0;
      seen = 0;

      if (!stopping && recognitionRef.current === rec) {
        try {
          rec.start();
          return;
        } catch (err) {
          console.warn("Failed to restart voice recognition:", err);
        }
      }

      // Stopped: whatever is left becomes the last item.
      clearTimeout(silenceTimer);
      const text = pending.join(" ").trim();
      if (text) onTranscriptRef.current(text);
      if (recognitionRef.current === rec) {
        recognitionRef.current = null;
        finishRef.current = null;
        setIsListening(false);
        onPreviewRef.current?.("");
      }
    };

    recognitionRef.current = rec;
    finishRef.current = finish;
    try {
      rec.start();
      restartSilenceTimer();
      setIsListening(true);
      toast.info(
        targetLang === "bn-BD"
          ? "কথা বলুন... বাংলায় ভয়েস টাইপিং চালু রয়েছে"
          : "Listening... English voice dictation active"
      );
    } catch (err) {
      console.error("Failed to start voice recognition:", err);
      clearTimeout(silenceTimer);
      recognitionRef.current = null;
      finishRef.current = null;
    }
  };

  const toggleListening = () => {
    if (!isSupported) {
      toast.error("আপনার ব্রাউজারে স্পিচ রিকগনিশন সমর্থিত নয় (Chrome/Edge ব্যবহার করুন)");
      return;
    }

    if (isListening) {
      // onend adds the dictation and resets the button.
      finishRef.current?.();
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

    // If currently listening, restart in the new language. What was heard in
    // the old one is dropped: a switch mid-dictation means it was the wrong one.
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
            <span className="w-[4.5rem] truncate text-left text-[11px] font-medium">
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
