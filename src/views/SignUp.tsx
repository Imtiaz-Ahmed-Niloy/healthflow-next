"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { BadgeInfo, CalendarDays, ChevronDown, Eye, EyeOff, Lock, Mail, Phone, Shield, User } from "lucide-react";
import { toast } from "sonner";
import { useForm, type SubmitErrorHandler, type SubmitHandler } from "react-hook-form";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/site/AuthLayout";
import { type PatientSignupRequest } from "@/redux/features/auth/authApi";
import { clearSignupResult, setSignupResult } from "@/redux/features/auth/authSlice";
import { useAppDispatch } from "@/redux/hooks";
import { supabase } from "@/lib/supabase/client";
import { homePathForRole } from "@/lib/auth/permissions";
import { Label } from "@/components/ui/label";

type PatientSignupFormValues = PatientSignupRequest;

const genderOptions = ["Female", "Male", "Non-binary", "Prefer not to say"] as const;
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
          ? "An account with this email already exists. Try signing in instead."
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
      <span data-testid="signup-success-message">Account created</span>,
      {
        description: needsConfirmation
          ? "Check your email to confirm your account, then sign in."
          : "Your patient account is ready.",
      },
    );

    reset();

    if (!needsConfirmation) {
      router.replace(homePathForRole("patient"));
      router.refresh();
    }
  };

  const onInvalid: SubmitErrorHandler<PatientSignupFormValues> = () => {
    toast.error("Please complete all required fields correctly.");
  };

  const today = getLocalDateValue();

  return (
    <AuthLayout>
      <div className="flex justify-center items-start pt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl bg-card shadow-soft p-8 md:p-10 w-full max-w-lg"
        >
          <div className="text-center">
            <span className="inline-flex rounded-full bg-chip text-chip-foreground px-4 py-1.5 text-[10px] font-bold tracking-widest">
              HEALTHFLOW
            </span>
            <h1 className="mt-5 font-display text-3xl text-primary">Create your patient account</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Join HealthFlow and start managing your care from one place.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              type="button"
              onClick={() => toast("Google sign-up coming soon")}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card hover:bg-muted/40 py-3 text-sm font-semibold transition-colors"
            >
              <span className="h-5 w-5 rounded-full bg-gradient-dark grid place-items-center text-[10px] text-surface-dark-foreground font-bold">
                G
              </span>
              Google
            </button>
            <button
              type="button"
              onClick={() => toast("SSO coming soon")}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card hover:bg-muted/40 py-3 text-sm font-semibold transition-colors"
            >
              <Shield className="h-4 w-4 text-primary" />
              SSO
            </button>
          </div>

          <div className="my-6 flex items-center gap-3">
            <hr className="flex-1 border-border/60" />
            <p className="text-[10px] tracking-widest font-bold text-muted-foreground">OR CREATE WITH EMAIL</p>
            <hr className="flex-1 border-border/60" />
          </div>

          <form data-testid="signup-form" onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="fullName" className="text-[11px] tracking-widest font-bold text-primary" required>
                FULL NAME
              </Label>
              <div className="relative mt-2">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="fullName"
                  data-testid="signup-full-name-input"
                  placeholder="Ayesha Rahman"
                  aria-invalid={Boolean(errors.fullName)}
                  aria-describedby={errors.fullName ? "fullName-error" : undefined}
                  className="w-full bg-muted/60 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  {...register("fullName", {
                    required: "Full name is required.",
                    validate: (value) => {
                      const trimmed = value.trim();

                      if (trimmed.length < 2) {
                        return "Full name must be at least 2 characters.";
                      }

                      if (trimmed.length > 100) {
                        return "Full name must be 100 characters or fewer.";
                      }

                      return trimmed.length > 0 || "Full name is required.";
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
                EMAIL ADDRESS
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
                PHONE NUMBER
              </Label>
              <div className="relative mt-2">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="phone"
                  data-testid="signup-phone-input"
                  type="tel"
                  inputMode="tel"
                  placeholder="01712345678 or +8801712345678"
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? "phone-error" : undefined}
                  className="w-full bg-muted/60 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  {...register("phone", {
                    required: "Phone number is required.",
                    validate: (value) => {
                      const trimmed = value.trim();
                      if (!trimmed) {
                        return "Phone number is required.";
                      }

                      const localPattern = /^01\d{9}$/;
                      const internationalPattern = /^\+8801\d{9}$/;
                      const plainCountryPattern = /^8801\d{9}$/;

                      return (
                        localPattern.test(trimmed) ||
                        internationalPattern.test(trimmed) ||
                        plainCountryPattern.test(trimmed) ||
                        "Please enter a valid phone number."
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
                PASSWORD
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
                    required: "Password is required.",
                    validate: (value) => {
                      if (value.length < 8) {
                        return "Password must be at least 8 characters.";
                      }

                      if (value.length > 128) {
                        return "Password must be 128 characters or fewer.";
                      }

                      const hasLetter = /[A-Za-z]/.test(value);
                      const hasNumber = /\d/.test(value);

                      return hasLetter && hasNumber
                        ? true
                        : "Password must contain at least one letter and one number.";
                    },
                  })}
                />
                <button
                  type="button"
                  data-testid="signup-toggle-password"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
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
                GENDER
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
                    required: "Please select a gender.",
                    validate: (value) => isSignupGender(value) || "Please select a gender.",
                  })}
                >
                  <option value="">Select gender</option>
                  {genderOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
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
                DATE OF BIRTH
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
                    required: "Date of birth is required.",
                    validate: (value) => {
                      const trimmed = value.trim();
                      if (!trimmed) {
                        return "Date of birth is required.";
                      }

                      const parsedDate = parseLocalDateValue(trimmed);

                      if (!parsedDate) {
                        return "Please enter a valid date of birth.";
                      }

                      const limit = parseLocalDateValue(today);

                      if (!limit) {
                        return "Please enter a valid date of birth.";
                      }

                      if (parsedDate > limit) {
                        return "Date of birth cannot be in the future.";
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
                  <span data-testid="signup-loading-text">Creating account...</span>
                </span>
              ) : (
                "Create Account"
              )}
            </button>

            <div className="rounded-2xl bg-muted/40 p-3 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex -space-x-2">
                <div className="h-6 w-6 rounded-full bg-chip border-2 border-card" />
                <div className="h-6 w-6 rounded-full bg-accent border-2 border-card" />
              </div>
              <p>&quot;The most intuitive clinical platform I&apos;ve ever used.&quot;</p>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link href="/signin" className="font-semibold text-primary-glow hover:underline">
                Sign In
              </Link>
            </p>
          </form>
        </motion.div>
      </div>
    </AuthLayout>
  );
};

export default Signup;
