"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, Shield, ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { AuthLayout } from "@/components/site/AuthLayout";
import { supabase } from "@/lib/supabase/client";
import { Label } from "@/components/ui/label";
const orbImg = "/assets/secure-orb.jpg";

const checks = (pw: string) => ({
  len: pw.length >= 12,
  num: /\d/.test(pw),
  case: /[a-z]/.test(pw) && /[A-Z]/.test(pw),
  special: /[^A-Za-z0-9]/.test(pw),
});

const Req = ({ ok, label }: { ok: boolean; label: string }) => (
  <div className={`flex items-center gap-2 text-xs ${ok ? "text-primary font-semibold" : "text-muted-foreground"}`}>
    {ok ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />} {label}
  </div>
);

const ResetPassword = () => {
  const t = useTranslations("auth.reset");
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const c = checks(pw);

  /**
   * Sets the new password.
   *
   * This works because following the emailed reset link puts a recovery
   * session in the browser, so updateUser knows which account to change. Open
   * this page directly without that link and Supabase rejects the update —
   * which is the correct behaviour, not a bug.
   */
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) return toast.error(t("mismatch"));
    if (!c.len || !c.num) return toast.error(t("weak"));

    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setIsSaving(false);

    if (error) {
      toast.error(
        error.message.toLowerCase().includes("session")
          ? t("expired")
          : error.message,
      );
      return;
    }

    toast.success(t("updated"), { description: t("signInNew") });
    // Drop the recovery session so the next sign-in is a real one.
    await supabase.auth.signOut();
    router.replace("/signin");
    router.refresh();
  };

  return (
    <AuthLayout>
      <div className="flex justify-center items-start pt-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="rounded-3xl bg-card shadow-soft overflow-hidden w-full max-w-lg border border-accent/40">
          <div className="relative">
            <img src={orbImg} alt={t("imageAlt")} loading="lazy" width={1024} height={768} className="w-full h-56 object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-card" />
            <div className="absolute -bottom-7 left-8 h-14 w-14 rounded-full bg-card flex items-center justify-center border-2 border-accent shadow-soft">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
          </div>

          <div className="px-8 pt-12 pb-8">
            <h1 className="font-display text-2xl text-primary text-center">{t("title")}</h1>
            <p className="text-sm text-muted-foreground mt-2 text-center max-w-xs mx-auto">{t("subtitle")}</p>

            <form onSubmit={onSubmit} className="mt-7 space-y-5">
              <div>
                <Label className="text-[11px] tracking-widest font-bold text-primary" required>{t("newPassword")}</Label>
                <div className="relative mt-2">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <input value={pw} onChange={e => setPw(e.target.value)} required type="password" placeholder="••••••••••••"
                    className="w-full bg-muted/40 border border-accent/40 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div>
                <Label className="text-[11px] tracking-widest font-bold text-primary" required>{t("confirmPassword")}</Label>
                <div className="relative mt-2">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <input value={pw2} onChange={e => setPw2(e.target.value)} required type="password" placeholder="••••••••••••"
                    className="w-full bg-muted/40 border border-accent/40 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>

              <div className="rounded-2xl bg-muted/40 p-5">
                <p className="text-[11px] tracking-widest font-bold text-primary">{t("requirements")}</p>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Req ok={c.len} label={t("reqLength")} />
                  <Req ok={c.num} label={t("reqNumber")} />
                  <Req ok={c.case} label={t("reqCase")} />
                  <Req ok={c.special} label={t("reqSpecial")} />
                </div>
              </div>

              <button disabled={isSaving}
                className="w-full rounded-full bg-gradient-dark text-surface-dark-foreground py-3.5 text-sm font-bold tracking-wider hover:opacity-90 shadow-glow transition-opacity flex items-center justify-center gap-2 disabled:opacity-60">
                {isSaving ? t("updating") : <>{t("update")} <ArrowRight className="h-4 w-4" /></>}
              </button>
              <p className="text-center text-xs text-muted-foreground">{t("trouble")} <Link href="/contact" className="font-semibold text-primary-glow hover:underline">{t("support")}</Link></p>
            </form>
          </div>
        </motion.div>
      </div>
    </AuthLayout>
  );
};
export default ResetPassword;

