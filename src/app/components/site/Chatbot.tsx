'use client';
import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Mic, MicOff, Volume2, VolumeX, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

const Chatbot = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I'm your HealthFlow assistant. Ask me about doctors, hospitals, bookings, or anything else. You can type or use the mic 🎙️" },
  ]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Setup speech recognition once
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = false;
    r.interimResults = false;
    r.lang = "en-US";
    r.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput("");
      send(transcript);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recognitionRef.current = r;
  }, []);

  const speak = (text: string) => {
    if (!voiceOn || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[*_`#>]/g, ""));
    u.rate = 1.05;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      toast.error("Voice input not supported in this browser. Try Chrome.");
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch {
        setListening(false);
      }
    }
  };

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Request failed");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let assistant = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              assistant += delta;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: assistant };
                return copy;
              });
            }
          } catch {}
        }
      }
      speak(assistant);
    } catch (e: any) {
      toast.error(e.message || "Chat failed");
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, I couldn't reach the assistant. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => setOpen((o) => !o)}
        aria-label="Open chat"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-elegant grid place-items-center hover:bg-primary-glow transition-colors"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-[min(92vw,400px)] h-[min(80vh,600px)] flex flex-col rounded-2xl border border-border bg-card shadow-elegant overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-dark text-surface-dark-foreground">
              <div>
                <div className="font-display text-lg leading-tight">HealthFlow Assistant</div>
                <div className="text-[11px] opacity-70">Online · Text & Voice</div>
              </div>
              <button
                onClick={() => setVoiceOn((v) => !v)}
                aria-label="Toggle voice"
                className="rounded-full p-2 hover:bg-surface-dark-foreground/10"
                title={voiceOn ? "Voice replies on" : "Voice replies off"}
              >
                {voiceOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-1 dark:prose-invert">
                      <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {loading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> thinking…
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="border-t border-border p-3 flex items-center gap-2 bg-card"
            >
              <button
                type="button"
                onClick={toggleMic}
                aria-label="Voice input"
                className={`shrink-0 h-10 w-10 grid place-items-center rounded-full transition-colors ${
                  listening ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-muted hover:bg-accent"
                }`}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={listening ? "Listening…" : "Type a message…"}
                className="flex-1 bg-muted rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send"
                className="shrink-0 h-10 w-10 grid place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary-glow"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Chatbot;
