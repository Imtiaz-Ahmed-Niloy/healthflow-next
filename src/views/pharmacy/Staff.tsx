"use client";

import { useTranslations } from "next-intl";
import { PharmacyLayout } from "@/components/pharmacy/PharmacyLayout";
import { StaffManager } from "@/components/pharmacy/StaffManager";

const Page = () => {
  const t = useTranslations("pharmacy.staff");

  return (
    <PharmacyLayout title={t("title")} subtitle={t("subtitle")} needs="administer">
      <StaffManager />
    </PharmacyLayout>
  );
};

export default Page;
