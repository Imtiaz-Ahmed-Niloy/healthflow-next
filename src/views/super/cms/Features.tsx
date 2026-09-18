"use client";

import { useTranslations } from "next-intl";
import { SuperLayout } from "@/components/super/SuperLayout";
import FeaturesPageEditor from "@/components/super/FeaturesPageEditor";

const CmsFeatures = () => {
  const t = useTranslations("super.cmsEditor.pages");
  return (
    <SuperLayout title={t("features.title")} subtitle={t("features.subtitle")}>
      <FeaturesPageEditor />
    </SuperLayout>
  );
};
export default CmsFeatures;
