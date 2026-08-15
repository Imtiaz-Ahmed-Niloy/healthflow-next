"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BarChart3, Eye, EyeOff, ShieldCheck, Stethoscope, User } from "lucide-react";
import { toast } from "sonner";
import { useForm, type SubmitErrorHandler, type SubmitHandler } from "react-hook-form";
import { AuthLayout } from "@/components/site/AuthLayout";
import { supabase } from "@/lib/supabase/client";
import { homePathForRole, type AppRole } from "@/lib/auth/permissions";
import { BRAND_INFO } from "@/constants/brand";

const vitamin = "/assets/product-vitamin.jpg";
const brain = "/assets/product-brain.jpg";
const sanitizer = "/assets/product-sanitizer.jpg";
const mist = "/assets/product-mist.jpg";

const sideAds = {
  left: [
    { tag: "SPONSORED", img: vitamin, t: "VitaBoost Pro", d: "Advanced multivitamin complex for daily performance and immunity support.", tagColor: "bg-primary text-primary-foreground" },
    { tag: "NEW ARRIVAL", img: sanitizer, t: "EcoSanit Max", d: "Eco-friendly medical grade sanitization for healthcare professionals.", tagColor: "bg-primary text-primary-foreground" },
  ],
  right: [
    { tag: "LIMITED OFFER", img: brain, t: "NeuroPlus", d: "Nootropic formulation for enhanced cognitive focus and mental clarity.", tagColor: "bg-destructive text-destructive-foreground" },
    { tag: "HEALTH TIP", img: mist, t: "SleepWell Mist", d: "Calming lavender and melatonin pillow spray for restorative sleep cycles.", tagColor: "bg-accent text-primary" },
  ],
};

const demos = [
  { icon: User, t: "Patient", e: "p-user@demo.pro", p: "patient123" },
  { icon: ShieldCheck, t: "Doctor", e: "dr-smith@demo.pro", p: "clinical456" },
  { icon: BarChart3, t: "Management", e: "mgmt@demo.pro", p: "flow789" },
  { icon: Stethoscope, t: "Super Admin", e: "root@demo.pro", p: "system000" },
];

const AdCard = ({ a }: { a: (typeof sideAds.left)[0] }) => (
  <motion.div whileHover={{ y: -4 }} className="rounded-3xl bg-card border border-border/60 overflow-hidden shadow-soft">
    <div className="relative">
      <img src={a.img} alt={a.t} loading="lazy" width={512} height={512} className="aspect-square w-full object-cover" />
      <span className={`absolute top-4 left-4 rounded-full px-3 py-1 text-[10px] font-bold tracking-wider ${a.tagColor}`}>{a.tag}</span>
    </div>
    <div className="p-5">
      <h4 className="font-semibold text-primary">{a.t}</h4>
      <p className="text-xs text-muted-foreground mt-2">{a.d}</p>
    </div>
  </motion.div>
);

interface SignInFormValues {
  email: string;
  password: string;
}

const SignIn = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<SignInFormValues>({
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  /**
   * Where to send someone after signing in.
   *
   * Comes from the role claim, not from the email address. The old version
   * routed on email prefixes ("dr-", "mgmt", "root"), which meant anyone who
   * registered as root@… landed in the super admin panel.
   */
  const destinationFor = (role: AppRole | null) => {
    const next = searchParams?.get("next");
    // Only honour relative paths — an absolute URL here is an open redirect.
    if (next && next.startsWith("/") && !next.startsWith("//")) return next;
    return homePathForRole(role);
  };

  /**
   * The single sign-in path. Both the form and the demo buttons go through
   * here, so there is no way for a shortcut to skip authentication — which is
   * exactly what the old demo buttons did.
   */
  const signInWith = async (email: string, password: string) => {
    setGeneralError(null);
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setIsLoading(false);
      setValue("password", "");
      const message =
        error.message === "Invalid login credentials"
          ? "That email and password do not match an account."
          : error.message;
      setGeneralError(message);
      toast.error(message);
      return;
    }

    // Read the role back off the freshly-issued token rather than guessing.
    const { data } = await supabase.auth.getClaims();
    const role =
      typeof data?.claims?.user_role === "string"
        ? (data.claims.user_role as AppRole)
        : null;

    toast.success("Welcome back!", { description: "Redirecting to your portal..." });

    // refresh() so server components re-render with the new session cookie.
    router.replace(destinationFor(role));
    router.refresh();
  };

  const onSubmit: SubmitHandler<SignInFormValues> = async (values) => {
    clearErrors();
    await signInWith(values.email.trim().toLowerCase(), values.password);
  };

  const onInvalid: SubmitErrorHandler<SignInFormValues> = () => {
    setGeneralError(null);
    toast.error("Please complete all required fields correctly.");
  };

  /**
   * One-click demo sign-in.
   *
   * These accounts are real Supabase users created by supabase/seed.sql, so
   * this goes through the same signInWith path as the form — no fabricated
   * session, no bypass. Previously the buttons forged a session client-side
   * and redirected on an email prefix, which meant the demo shortcut was also
   * an authentication bypass.
   *
   * Development convenience only. Remove this block before production.
   */
  const fillDemo = async (mail: string, p: string) => {
    setValue("email", mail, { shouldDirty: true, shouldValidate: true });
    setValue("password", p, { shouldDirty: true, shouldValidate: true });
    clearErrors();
    await signInWith(mail, p);
  };

  return (
    <AuthLayout>
      <div className="grid lg:grid-cols-[1fr_minmax(380px,520px)_1fr] gap-6 items-start">
        <div className="hidden lg:flex flex-col gap-6">{sideAds.left.map(a => <AdCard key={a.t} a={a} />)}</div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="rounded-3xl bg-card shadow-soft p-8 md:p-10">
          <div className="text-center">
            <img src={BRAND_INFO.logo} alt={`${BRAND_INFO.name} logo`} className="mx-auto h-24 w-24 object-contain" />
            <h1 className="mt-3 font-display text-3xl text-primary">{BRAND_INFO.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">Welcome back!</p>
          </div>

          <form data-testid="signin-form" onSubmit={handleSubmit(onSubmit, onInvalid)} className="mt-8 space-y-5" noValidate>
            <div>
              <label htmlFor="signin-email" className="text-[11px] tracking-widest font-bold text-primary">EMAIL / USER ID</label>
              <input
                id="signin-email"
                data-testid="signin-email-input"
                type="email"
                placeholder="name@healthflow.pro or admin-riverside"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "signin-email-error" : undefined}
                className="mt-2 w-full bg-muted/60 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary transition-all"
                {...register("email", {
                  required: "Email address is required.",
                  validate: (value) => {
                    const trimmed = value.trim();

                    if (!trimmed) {
                      return "Email address is required.";
                    }

                    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    return emailPattern.test(trimmed) || "Please enter a valid email address.";
                  },
                })}
              />
              {errors.email?.message ? (
                <p id="signin-email-error" data-testid="signin-email-error" role="alert" className="mt-1.5 text-xs text-destructive">
                  {errors.email.message}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="signin-password" className="text-[11px] tracking-widest font-bold text-primary">PASSWORD</label>
              <div className="relative mt-2">
                <input
                  id="signin-password"
                  data-testid="signin-password-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="********"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? "signin-password-error" : undefined}
                  className="w-full bg-muted/60 rounded-xl px-4 py-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary transition-all"
                  {...register("password", {
                    required: "Password is required.",
                    minLength: {
                      value: 8,
                      message: "Password must be at least 8 characters.",
                    },
                    maxLength: {
                      value: 128,
                      message: "Password must be 128 characters or fewer.",
                    },
                  })}
                />
                <button
                  type="button"
                  data-testid="signin-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password?.message ? (
                <p id="signin-password-error" data-testid="signin-password-error" role="alert" className="mt-1.5 text-xs text-destructive">
                  {errors.password.message}
                </p>
              ) : null}
            </div>
            {generalError ? (
              <p data-testid="signin-general-error" role="alert" className="text-xs text-destructive">
                {generalError}
              </p>
            ) : null}
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-foreground/70 cursor-pointer">
                <input type="checkbox" className="rounded border-border" /> Remember me
              </label>
              <Link href="/forgot-password" className="font-semibold text-primary-glow hover:underline">Forgot password?</Link>
            </div>
            <button
              type="submit"
              data-testid="signin-submit-button"
              disabled={isLoading}
              className="w-full rounded-full bg-gradient-dark text-surface-dark-foreground py-3.5 text-sm font-semibold hover:opacity-90 shadow-glow transition-opacity disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <span data-testid="signin-loading" className="inline-flex items-center justify-center">
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
            <p className="text-center text-xs text-muted-foreground">Don't have an account? <Link href="/signup" className="font-semibold text-primary-glow hover:underline">Create One</Link></p>
          </form>

          <div className="mt-10 pt-6 border-t border-border/60">
            <p className="text-center text-[10px] tracking-widest font-bold text-muted-foreground">DEMO ACCESS</p>
            {/* Always two columns. sm:grid-cols-4 fired on viewport width, but
                this card is a fixed 520px at every breakpoint, so four cards
                got ~80px each and the emails truncated. */}
            <div className="grid grid-cols-2 gap-2.5 mt-4">
              {demos.map(d => (
                <button key={d.t} type="button" onClick={() => fillDemo(d.e, d.p)}
                  className="text-left rounded-xl bg-muted/40 hover:bg-chip transition-colors p-3 border border-border/40">
                  <d.icon className="h-3.5 w-3.5 text-primary" />
                  <p className="text-xs font-semibold text-primary mt-2">{d.t}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">{d.e}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">pass: {d.p}</p>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="hidden lg:flex flex-col gap-6">{sideAds.right.map(a => <AdCard key={a.t} a={a} />)}</div>
      </div>
    </AuthLayout>
  );
};

export default SignIn;
