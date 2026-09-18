"use client";

import { useTranslations } from "next-intl";
import type { AppRole } from "@/lib/auth/permissions";

/** A role as a person reads it, in the page's language — "Hospital Admin", "হাসপাতাল অ্যাডমিন". */
export const useRoleLabel = () => {
  const t = useTranslations("roles");
  return (role: AppRole | null | undefined) => t(role ?? "signedOut");
};
