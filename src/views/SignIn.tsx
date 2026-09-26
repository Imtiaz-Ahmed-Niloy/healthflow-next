"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BarChart3, Eye, EyeOff, ShieldCheck, Stethoscope, User } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useForm, type SubmitErrorHandler, type SubmitHandler } from "react-hook-form";
import { AuthLayout } from "@/components/site/AuthLayout";
import { GoogleAuthButton } from "@/components/site/GoogleAuthButton";
import { supabase } from "@/lib/supabase/client";
import { homePathForRole, type AppRole } from "@/lib/auth/permissions";
import { BRAND_INFO } from "@/constants/brand";
import { Label } from "@/components/ui/label";
import { mediaUrl } from "@/lib/media";

/**
 * One promotional card, as `public.signin_ads` stores it (0064). A super
 * admin edits these on /super/ads; this page draws whatever is live.
 */
export type SigninAd = {
  id: string;
  side: "left" | "right";
  position: number;
  badge: string | null;
  badge_tone: string;
  title: string;
  body: string | null;
  image_url: string | null;
  link_url: string | null;
};

/** The four tones the badge may take, as the table's check constraint allows. */
const BADGE_TONE: Record<string, string> = {
  primary: "bg-primary text-primary-foreground",
  accent: "bg-accent text-primary",
  destructive: "bg-destructive text-destructive-foreground",
  muted: "bg-muted text-muted-foreground",
};

// `role` names a key in auth.signIn.demoRoles.
const demos = [
  { icon: User, role: "patient", e: "p-user@demo.pro", p: "patient123" },
  { icon: ShieldCheck, role: "doctor", e: "dr-smith@demo.pro", p: "clinical456" },
  { icon: BarChart3, role: "management", e: "mgmt@demo.pro", p: "flow789" },
  { icon: Stethoscope, role: "superAdmin", e: "root@demo.pro", p: "system000" },
] as const;

const AdCard = ({ ad }: { ad: SigninAd }) => {
  const image = mediaUrl(ad.image_url);

  const card = (
    <motion.div whileHover={{ y: -4 }} className="rounded-3xl bg-card border border-border/60 overflow-hidden shadow-soft h-full">
      <div className="relative">
        {image
          ? <img src={image} alt={ad.title} loading="lazy" width={512} height={512} className="aspect-square w-full object-cover" />
          : <div className="aspect-square w-full bg-muted/40" />}
        {ad.badge && (
          <span className={`absolute top-4 left-4 rounded-full px-3 py-1 text-[10px] font-bold tracking-wider ${BADGE_TONE[ad.badge_tone] ?? BADGE_TONE.primary}`}>
            {ad.badge}
          </span>
        )}
      </div>
      <div className="p-5">
        <h4 className="font-semibold text-primary">{ad.title}</h4>
        {ad.body && <p className="text-xs text-muted-foreground mt-2">{ad.body}</p>}
      </div>
    </motion.div>
  );

  // A card without a link is not a link — wrapping it in an anchor that goes
  // nowhere would give it a pointer cursor and a tab stop for nothing.
  return ad.link_url
    ? <a href={ad.link_url} target="_blank" rel="noreferrer noopener sponsored" className="block">{card}</a>
    : card;
};

interface SignInFormValues {
  email: string;
  password: string;
}

const SignIn = ({ ads = [] }: { ads?: SigninAd[] }) => {
  const t = useTranslations("auth.signIn");
  const left = ads.filter(a => a.side === "left");
  const right = ads.filter(a => a.side === "right");

  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * /auth/callback sends a failed Google sign-in back here with the reason
   * rather than dropping the person on a blank form wondering what happened.
   */
  const oauthError = searchParams?.get("error");
  useEffect(() => {
    if (!oauthError) return;
    setGeneralError(oauthError);
    toast.error(oauthError);
  }, [oauthError]);
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
          ? t("badCredentials")
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

    toast.success(t("welcomeBack"), { description: t("redirecting") });

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
    toast.error(t("completeFields"));
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
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(380px,520px)_1fr] gap-6 items-start">
        <div className="hidden lg:flex flex-col gap-6">{left.map(a => <AdCard key={a.id} ad={a} />)}</div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          // A card from tablets up; on a phone the page itself is white
          // (AuthLayout), so the form sits on it with no card at all.
          className="md:bg-card md:rounded-3xl md:shadow-soft md:p-10">
          <div className="text-center">
            {/* A title and a line under it, as on sign-up, rather than the big
                logo: the header above already carries the brand. */}
            <h1 className="font-display text-xl sm:text-3xl text-primary">{t("welcomeBack")}</h1>
            <p className="text-sm text-muted-foreground mt-2">{t("subtitle", { brand: BRAND_INFO.name })}</p>
          </div>

          {/* The same as on sign-up. Someone who signed up with Google signs
              in with it; `next` brings them back where they started — a
              doctor's profile with the booking form open, say. */}
          <GoogleAuthButton disabled={isLoading} next={searchParams?.get("next")} className="mt-8" />

          <div className="my-6 flex items-center gap-3">
            <hr className="flex-1 border-border/60" />
            <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("orEmail")}</p>
            <hr className="flex-1 border-border/60" />
          </div>

          <form data-testid="signin-form" onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-5" noValidate>
            <div>
              <Label htmlFor="signin-email" className="text-[11px] tracking-widest font-bold text-primary" required>{t("emailLabel")}</Label>
              <input
                id="signin-email"
                data-testid="signin-email-input"
                type="email"
                placeholder={t("emailPlaceholder")}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "signin-email-error" : undefined}
                className="mt-2 w-full bg-muted/60 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary transition-all"
                {...register("email", {
                  required: t("emailRequired"),
                  validate: (value) => {
                    const trimmed = value.trim();

                    if (!trimmed) {
                      return t("emailRequired");
                    }

                    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    return emailPattern.test(trimmed) || t("emailInvalid");
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
              <Label htmlFor="signin-password" className="text-[11px] tracking-widest font-bold text-primary" required>{t("passwordLabel")}</Label>
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
                    required: t("passwordRequired"),
                    minLength: {
                      value: 8,
                      message: t("passwordMin"),
                    },
                    maxLength: {
                      value: 128,
                      message: t("passwordMax"),
                    },
                  })}
                />
                <button
                  type="button"
                  data-testid="signin-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label={showPassword ? t("hidePassword") : t("showPassword")}
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
                <input type="checkbox" className="rounded border-border" /> {t("rememberMe")}
              </label>
              <Link href="/forgot-password" className="font-semibold text-primary-glow hover:underline">{t("forgot")}</Link>
            </div>
            <button
              type="submit"
              data-testid="signin-submit-button"
              disabled={isLoading}
              className="w-full rounded-full bg-gradient-dark text-surface-dark-foreground py-3.5 text-sm font-semibold hover:opacity-90 shadow-glow transition-opacity disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <span data-testid="signin-loading" className="inline-flex items-center justify-center">
                  {t("signingIn")}
                </span>
              ) : (
                t("submit")
              )}
            </button>
            <p className="text-center text-xs text-muted-foreground">{t("noAccount")} <Link href="/signup" className="font-semibold text-primary-glow hover:underline">{t("createOne")}</Link></p>
          </form>

          <div className="mt-10 pt-6 border-t border-border/60">
            <p className="text-center text-[10px] tracking-widest font-bold text-muted-foreground">{t("demoAccess")}</p>
            {/* Always two columns. sm:grid-cols-4 fired on viewport width, but
                this card is a fixed 520px at every breakpoint, so four cards
                got ~80px each and the emails truncated. */}
            <div className="grid grid-cols-2 gap-2.5 mt-4">
              {demos.map(d => (
                <button key={d.role} type="button" onClick={() => fillDemo(d.e, d.p)}
                  className="text-left rounded-xl bg-muted/40 hover:bg-chip transition-colors p-3 border border-border/40">
                  <d.icon className="h-3.5 w-3.5 text-primary" />
                  <p className="text-xs font-semibold text-primary mt-2">{t(`demoRoles.${d.role}`)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">{d.e}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{t("demoPass", { password: d.p })}</p>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="hidden lg:flex flex-col gap-6">{right.map(a => <AdCard key={a.id} ad={a} />)}</div>
      </div>
    </AuthLayout>
  );
};

export default SignIn;
