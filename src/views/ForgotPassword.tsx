"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { RotateCcw, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { AuthLayout } from "@/components/site/AuthLayout";
import { supabase } from "@/lib/supabase/client";
import { Label } from "@/components/ui/label";

// Supabase emails a reset link, not a numeric code, so the old OTP step has
// been removed rather than left to collect a code that never arrives.
type Step = "email" | "done";

const ForgotPassword = () => {
  const t = useTranslations("auth.forgot");
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setIsSending(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    // Always report success, even for an address with no account. Telling the
    // caller which emails are registered is an account-enumeration hole.
    toast.success(t("sent"), { description: t("check", { email }) });
    setStep("done");
  };

  return (
    <AuthLayout>
      <div className="flex justify-center items-start pt-12">
        <AnimatePresence mode="wait">
          <motion.div key={step}
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.35 }}
            className="rounded-3xl bg-card shadow-soft p-10 w-full max-w-md text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-chip flex items-center justify-center text-primary">
              {step === "done" ? <CheckCircle2 className="h-6 w-6" /> : <RotateCcw className="h-6 w-6" />}
            </div>
            <h1 className="mt-6 font-display text-3xl text-primary">{step === "done" ? t("doneTitle") : t("title")}</h1>
            <p className="text-sm text-muted-foreground mt-3 max-w-xs mx-auto">
              {step === "email" && t("intro")}
              {step === "done" && t("doneBody")}
            </p>

            {step === "email" && (
              <form onSubmit={sendLink} className="mt-8 space-y-5 text-left">
                <div>
                  <Label className="text-sm font-medium text-primary" required>{t("email")}</Label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input value={email} onChange={e => setEmail(e.target.value)} required type="email" placeholder={t("emailPlaceholder")}
                      className="w-full bg-muted/60 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
                <button disabled={isSending}
                  className="w-full rounded-full bg-gradient-dark text-surface-dark-foreground py-3.5 text-sm font-semibold hover:opacity-90 shadow-glow transition-opacity disabled:opacity-60">
                  {isSending ? t("sending") : t("send")}
                </button>
              </form>
            )}

            <Link href="/signin" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
              <ArrowLeft className="h-4 w-4" /> {t("back")}
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>
    </AuthLayout>
  );
};
export default ForgotPassword;

