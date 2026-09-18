"use client";

import { useTranslations } from "next-intl";
import { SuperLayout } from "@/components/super/SuperLayout";
import HomepageEditor from "@/components/super/HomepageEditor";

const CmsHome = () => {
  const t = useTranslations("super.cmsEditor.pages");
  return (
    <SuperLayout title={t("home.title")} subtitle={t("home.subtitle")}>
      <HomepageEditor />
    </SuperLayout>
  );
};
export default CmsHome;
