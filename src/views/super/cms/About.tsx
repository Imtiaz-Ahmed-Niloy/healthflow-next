"use client";

import { useTranslations } from "next-intl";
import { SuperLayout } from "@/components/super/SuperLayout";
import AboutPageEditor from "@/components/super/AboutPageEditor";

const CmsAbout = () => {
  const t = useTranslations("super.cmsEditor.pages");
  return (
    <SuperLayout title={t("about.title")} subtitle={t("about.subtitle")}>
      <AboutPageEditor />
    </SuperLayout>
  );
};
export default CmsAbout;
