'use client';
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Eye, EyeOff, Briefcase, Settings, Shield, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/site/AuthLayout";

const SignUp = () => {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [role, setRole] = useState<"provider" | "admin">("provider");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Account created", { description: "Welcome to HealthFlow!" });
    setTimeout(() => router.push("/portal/queue"), 600);
  };

  return (
    <AuthLayout>
      <div className="flex justify-center items-start pt-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="rounded-3xl bg-card shadow-soft p-8 md:p-10 w-full max-w-lg">
          <div className="text-center">
            <span className="inline-flex rounded-full bg-chip text-chip-foreground px-4 py-1.5 text-[10px] font-bold tracking-widest">HEALTHFLOW</span>
            <h1 className="mt-5 font-display text-3xl text-primary">Create your account</h1>
            <p className="text-sm text-muted-foreground mt-2">Start your Month free trial. No credit card required.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <button type="button" onClick={() => toast("Google sign-up coming soon")} className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card hover:bg-muted/40 py-3 text-sm font-semibold transition-colors">
              <span className="h-5 w-5 rounded-full bg-gradient-dark grid place-items-center text-[10px] text-surface-dark-foreground font-bold">G</span> Google
            </button>
            <button type="button" onClick={() => toast("SSO coming soon")} className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card hover:bg-muted/40 py-3 text-sm font-semibold transition-colors">
              <Shield className="h-4 w-4 text-primary" /> SSO
            </button>
          </div>

          <div className="my-6 flex items-center gap-3">
            <hr className="flex-1 border-border/60" />
            <p className="text-[10px] tracking-widest font-bold text-muted-foreground">OR CREATE WITH EMAIL</p>
            <hr className="flex-1 border-border/60" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] tracking-widest font-bold text-primary">FULL NAME</label>
              <div className="relative mt-2">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input required placeholder="Dr. Julian Reed" className="w-full bg-muted/60 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div>
              <label className="text-[11px] tracking-widest font-bold text-primary">EMAIL ADDRESS</label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input required type="email" placeholder="j.reed@medical.com" className="w-full bg-muted/60 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div>
              <label className="text-[11px] tracking-widest font-bold text-primary">PASSWORD</label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input required type={show ? "text" : "password"} placeholder="••••••••" className="w-full bg-muted/60 rounded-xl pl-10 pr-10 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] tracking-widest font-bold text-primary">PROFESSIONAL ROLE</label>
              <div className="mt-2 space-y-2">
                {[
                  { id: "provider" as const, icon: Briefcase, t: "Medical Provider" },
                  { id: "admin" as const, icon: Settings, t: "Administrative Staff" },
                ].map(r => (
                  <button key={r.id} type="button" onClick={() => setRole(r.id)}
                    className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-all border-2 ${role === r.id ? "bg-chip border-primary text-primary" : "bg-muted/40 border-transparent text-foreground/70 hover:bg-muted/60"}`}>
                    <span className="flex items-center gap-3"><r.icon className="h-4 w-4" /> {r.t}</span>
                    {role === r.id && <CheckCircle2 className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </div>

            <button className="w-full rounded-full bg-gradient-dark text-surface-dark-foreground py-3.5 text-sm font-semibold hover:opacity-90 shadow-glow transition-opacity">Create Account</button>

            <div className="rounded-2xl bg-muted/40 p-3 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex -space-x-2">
                <div className="h-6 w-6 rounded-full bg-chip border-2 border-card" />
                <div className="h-6 w-6 rounded-full bg-accent border-2 border-card" />
              </div>
              <p>"The most intuitive clinical platform I've ever used."</p>
            </div>

            <p className="text-center text-xs text-muted-foreground">Already have an account? <Link href="/signin" className="font-semibold text-primary-glow hover:underline">Sign In</Link></p>
          </form>
        </motion.div>
      </div>
    </AuthLayout>
  );
};
export default SignUp;
