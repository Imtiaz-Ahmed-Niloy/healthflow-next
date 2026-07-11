"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { RotateCcw, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/site/AuthLayout";

type Step = "email" | "otp" | "done";

const ForgotPassword = () => {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const sendLink = (e: React.FormEvent) => { e.preventDefault(); toast.success("Reset link sent", { description: `Check ${email}` }); setStep("otp"); };
  const verify = (e: React.FormEvent) => { e.preventDefault(); setStep("done"); };

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
            <h1 className="mt-6 font-display text-3xl text-primary">{step === "done" ? "Check your inbox!" : "Forgot Password?"}</h1>
            <p className="text-sm text-muted-foreground mt-3 max-w-xs mx-auto">
              {step === "email" && "No worries, it happens. Enter the email address associated with your account and we will send you a reset link."}
              {step === "otp" && "Enter the 6-digit verification code we just sent to your email address."}
              {step === "done" && "We've sent password reset instructions. Follow the link in the email to set a new password."}
            </p>

            {step === "email" && (
              <form onSubmit={sendLink} className="mt-8 space-y-5 text-left">
                <div>
                  <label className="text-sm font-medium text-primary">Email Address</label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input value={email} onChange={e => setEmail(e.target.value)} required type="email" placeholder="name@healthcare.com"
                      className="w-full bg-muted/60 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
                <button className="w-full rounded-full bg-gradient-dark text-surface-dark-foreground py-3.5 text-sm font-semibold hover:opacity-90 shadow-glow transition-opacity">Send Reset Link</button>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={verify} className="mt-8 space-y-5 text-left">
                <div>
                  <label className="text-sm font-medium text-primary">OTP Code</label>
                  <input value={otp} onChange={e => setOtp(e.target.value)} required maxLength={6} placeholder="123456"
                    className="mt-2 w-full bg-muted/60 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <button className="w-full rounded-full bg-gradient-dark text-surface-dark-foreground py-3.5 text-sm font-semibold hover:opacity-90 shadow-glow transition-opacity">Submit</button>
              </form>
            )}

            {step === "done" && (
              <Link href="/reset-password" className="mt-8 inline-block w-full rounded-full bg-gradient-dark text-surface-dark-foreground py-3.5 text-sm font-semibold hover:opacity-90 shadow-glow transition-opacity">Continue to Reset</Link>
            )}

            <Link href="/signin" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
              <ArrowLeft className="h-4 w-4" /> Back to Login
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>
    </AuthLayout>
  );
};
export default ForgotPassword;

