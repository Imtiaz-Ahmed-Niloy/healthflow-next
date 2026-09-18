"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { BadgeInfo, CalendarDays, ChevronDown, Eye, EyeOff, Lock, Mail, Phone, User } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useForm, type SubmitErrorHandler, type SubmitHandler } from "react-hook-form";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/site/AuthLayout";
import { GoogleAuthButton } from "@/components/site/GoogleAuthButton";
import { type PatientSignupRequest } from "@/redux/features/auth/authApi";
import { clearSignupResult, setSignupResult } from "@/redux/features/auth/authSlice";
import { useAppDispatch } from "@/redux/hooks";
import { supabase } from "@/lib/supabase/client";
import { homePathForRole } from "@/lib/auth/permissions";
import { Label } from "@/components/ui/label";

type PatientSignupFormValues = PatientSignupRequest;

const genderOptions = ["Female", "Male", "Non-binary", "Prefer not to say"] as const;
// The values above are what the account stores; these are their labels' keys.
const GENDER_KEY = { Female: "female", Male: "male", "Non-binary": "nonBinary", "Prefer not to say": "preferNot" } as const;
const signupFieldNames = ["fullName", "email", "phone", "password", "gender", "dateOfBirth"] as const;

const isSignupGender = (value: string): value is (typeof genderOptions)[number] =>
  genderOptions.includes(value as (typeof genderOptions)[number]);

const getLocalDateValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const parseLocalDateValue = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const Signup = () => {
  const t = useTranslations("auth.signUp");
  const ts = useTranslations("auth.signIn");
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { errors },
  } = useForm<PatientSignupFormValues>({
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      gender: "",
      dateOfBirth: "",
    },
  });

  useEffect(() => {
    dispatch(clearSignupResult());
  }, [dispatch]);

  /**
   * Public signup, which only ever creates a patient.
   *
   * Role and tenant are NOT sent from here. The handle_new_user trigger
   * (migration 0006) defaults anyone without role metadata to 'patient' with
   * no hospital. Staff accounts are created by provisioning with the service
   * role, never through this form — otherwise anyone could register as a
   * super admin.
   *
   * The extra profile fields go into user metadata, which the trigger copies
   * onto the profiles row.
   */
  const onSubmit: SubmitHandler<PatientSignupFormValues> = async (values) => {
    clearErrors();
    dispatch(clearSignupResult());
    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signUp({
      email: values.email.trim().toLowerCase(),
      password: values.password,
      options: {
        data: {
          full_name: values.fullName.trim(),
          phone: values.phone.trim(),
          gender: values.gender,
          date_of_birth: values.dateOfBirth,
        },
      },
    });

    setIsSubmitting(false);

    if (error) {
      const message =
        error.message === "User already registered"
          ? t("exists")
          : error.message;

      if (message.toLowerCase().includes("email")) {
        setError("email", { type: "server", message });
      } else if (message.toLowerCase().includes("password")) {
        setError("password", { type: "server", message });
      }

      toast.error(<span data-testid="signup-general-error">{message}</span>);
      return;
    }

    // Store only what the success screen renders. Supabase's User carries a
    // lot more and does not match the slice's shape.
    dispatch(
      setSignupResult({
        data: data.user ? { id: data.user.id, email: data.user.email ?? "" } : null,
        success: true,
      }),
    );

    // With email confirmation on, there is no session yet — say so plainly
    // rather than leaving someone waiting to be redirected.
    const needsConfirmation = !data.session;

    toast.success(
      <span data-testid="signup-success-message">{t("created")}</span>,
      {
        description: needsConfirmation ? t("confirmEmail") : t("ready"),
      },
    );

    reset();

    if (!needsConfirmation) {
      router.replace(homePathForRole("patient"));
      router.refresh();
    }
  };

  const onInvalid: SubmitErrorHandler<PatientSignupFormValues> = () => {
    toast.error(ts("completeFields"));
  };

  const today = getLocalDateValue();

  return (
    <AuthLayout>
      <div className="flex justify-center items-start pt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          // A card from tablets up; on a phone the page itself is white
          // (AuthLayout), so the form sits on it with no card at all.
          className="w-full md:max-w-lg md:bg-card md:rounded-3xl md:shadow-soft md:p-10"
        >
          <div className="text-center">
            {/* text-xl on a phone keeps "Create your patient account" to one
                line; at text-3xl it wrapped. */}
            <h1 className="font-display text-xl sm:text-3xl text-primary">{t("title")}</h1>
            <p className="text-sm text-muted-foreground mt-2">{t("subtitle")}</p>
          </div>

          {/* Google returns a name and an email and nothing else, so a new
              patient still has a phone, gender and date of birth to fill in. */}
          <GoogleAuthButton disabled={isLoading} className="mt-8" />

          <div className="my-6 flex items-center gap-3">
            <hr className="flex-1 border-border/60" />
            <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("orEmail")}</p>
            <hr className="flex-1 border-border/60" />
          </div>

          <form data-testid="signup-form" onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="fullName" className="text-[11px] tracking-widest font-bold text-primary" required>
                {t("fullName")}
              </Label>
              <div className="relative mt-2">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="fullName"
                  data-testid="signup-full-name-input"
                  placeholder={t("fullNamePlaceholder")}
                  aria-invalid={Boolean(errors.fullName)}
                  aria-describedby={errors.fullName ? "fullName-error" : undefined}
                  className="w-full bg-muted/60 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  {...register("fullName", {
                    required: t("fullNameRequired"),
                    validate: (value) => {
                      const trimmed = value.trim();

                      if (trimmed.length < 2) {
                        return t("fullNameMin");
                      }

                      if (trimmed.length > 100) {
                        return t("fullNameMax");
                      }

                      return trimmed.length > 0 || t("fullNameRequired");
                    },
                  })}
                />
              </div>
              {errors.fullName?.message ? (
                <p
                  id="fullName-error"
                  data-testid="signup-full-name-error"
                  role="alert"
                  className="mt-1.5 text-xs text-destructive"
                >
                  {errors.fullName.message}
                </p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="email" className="text-[11px] tracking-widest font-bold text-primary" required>
                {t("email")}
              </Label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="email"
                  data-testid="signup-email-input"
                  type="email"
                  placeholder="patient@example.com"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className="w-full bg-muted/60 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  {...register("email", {
                    required: ts("emailRequired"),
                    validate: (value) => {
                      const trimmed = value.trim();
                      if (!trimmed) {
                        return ts("emailRequired");
                      }

                      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                      return emailPattern.test(trimmed) || ts("emailInvalid");
                    },
                  })}
                />
              </div>
              {errors.email?.message ? (
                <p
                  id="email-error"
                  data-testid="signup-email-error"
                  role="alert"
                  className="mt-1.5 text-xs text-destructive"
                >
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="phone" className="text-[11px] tracking-widest font-bold text-primary" required>
                {t("phone")}
              </Label>
              <div className="relative mt-2">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="phone"
                  data-testid="signup-phone-input"
                  type="tel"
                  inputMode="tel"
                  placeholder={t("phonePlaceholder")}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? "phone-error" : undefined}
                  className="w-full bg-muted/60 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  {...register("phone", {
                    required: t("phoneRequired"),
                    validate: (value) => {
                      const trimmed = value.trim();
                      if (!trimmed) {
                        return t("phoneRequired");
                      }

                      const localPattern = /^01\d{9}$/;
                      const internationalPattern = /^\+8801\d{9}$/;
                      const plainCountryPattern = /^8801\d{9}$/;

                      return (
                        localPattern.test(trimmed) ||
                        internationalPattern.test(trimmed) ||
                        plainCountryPattern.test(trimmed) ||
                        t("phoneInvalid")
                      );
                    },
                  })}
                />
              </div>
              {errors.phone?.message ? (
                <p
                  id="phone-error"
                  data-testid="signup-phone-error"
                  role="alert"
                  className="mt-1.5 text-xs text-destructive"
                >
                  {errors.phone.message}
                </p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="password" className="text-[11px] tracking-widest font-bold text-primary" required>
                {ts("passwordLabel")}
              </Label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="password"
                  data-testid="signup-password-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  className="w-full bg-muted/60 rounded-xl pl-10 pr-10 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  {...register("password", {
                    required: ts("passwordRequired"),
                    validate: (value) => {
                      if (value.length < 8) {
                        return ts("passwordMin");
                      }

                      if (value.length > 128) {
                        return ts("passwordMax");
                      }

                      const hasLetter = /[A-Za-z]/.test(value);
                      const hasNumber = /\d/.test(value);

                      return hasLetter && hasNumber
                        ? true
                        : t("passwordMix");
                    },
                  })}
                />
                <button
                  type="button"
                  data-testid="signup-toggle-password"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label={showPassword ? ts("hidePassword") : ts("showPassword")}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password?.message ? (
                <p
                  id="password-error"
                  data-testid="signup-password-error"
                  role="alert"
                  className="mt-1.5 text-xs text-destructive"
                >
                  {errors.password.message}
                </p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="gender" className="text-[11px] tracking-widest font-bold text-primary" required>
                {t("gender")}
              </Label>
              <div className="relative mt-2">
                <BadgeInfo className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <select
                  id="gender"
                  data-testid="signup-gender-select"
                  aria-invalid={Boolean(errors.gender)}
                  aria-describedby={errors.gender ? "gender-error" : undefined}
                  className="w-full appearance-none bg-muted/60 rounded-xl pl-10 pr-10 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  {...register("gender", {
                    required: t("genderRequired"),
                    validate: (value) => isSignupGender(value) || t("genderRequired"),
                  })}
                >
                  <option value="">{t("selectGender")}</option>
                  {genderOptions.map((option) => (
                    <option key={option} value={option}>
                      {t(`genders.${GENDER_KEY[option]}`)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              {errors.gender?.message ? (
                <p
                  id="gender-error"
                  data-testid="signup-gender-error"
                  role="alert"
                  className="mt-1.5 text-xs text-destructive"
                >
                  {errors.gender.message}
                </p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="dateOfBirth" className="text-[11px] tracking-widest font-bold text-primary" required>
                {t("dob")}
              </Label>
              <div className="relative mt-2">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="dateOfBirth"
                  data-testid="signup-date-of-birth-input"
                  type="date"
                  max={today}
                  aria-invalid={Boolean(errors.dateOfBirth)}
                  aria-describedby={errors.dateOfBirth ? "dateOfBirth-error" : undefined}
                  className="w-full bg-muted/60 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  {...register("dateOfBirth", {
                    required: t("dobRequired"),
                    validate: (value) => {
                      const trimmed = value.trim();
                      if (!trimmed) {
                        return t("dobRequired");
                      }

                      const parsedDate = parseLocalDateValue(trimmed);

                      if (!parsedDate) {
                        return t("dobInvalid");
                      }

                      const limit = parseLocalDateValue(today);

                      if (!limit) {
                        return t("dobInvalid");
                      }

                      if (parsedDate > limit) {
                        return t("dobFuture");
                      }

                      return true;
                    },
                  })}
                />
              </div>
              {errors.dateOfBirth?.message ? (
                <p
                  id="dateOfBirth-error"
                  data-testid="signup-date-of-birth-error"
                  role="alert"
                  className="mt-1.5 text-xs text-destructive"
                >
                  {errors.dateOfBirth.message}
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              data-testid="signup-submit-button"
              disabled={isLoading}
              className="w-full rounded-full bg-gradient-dark text-surface-dark-foreground py-3.5 text-sm font-semibold hover:opacity-90 shadow-glow transition-opacity disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <span data-testid="signup-loading" className="inline-flex items-center justify-center">
                  <span data-testid="signup-loading-text">{t("creating")}</span>
                </span>
              ) : (
                t("submit")
              )}
            </button>

            <p className="text-center text-xs text-muted-foreground">
              {t("haveAccount")}{" "}
              <Link href="/signin" className="font-semibold text-primary-glow hover:underline">
                {ts("submit")}
              </Link>
            </p>
          </form>
        </motion.div>
      </div>
    </AuthLayout>
  );
};

export default Signup;
