"use client";

import { useTranslations } from "next-intl";
import { SuperLayout } from "@/components/super/SuperLayout";
import BlogPageEditor from "@/components/super/BlogPageEditor";

const CmsBlog = () => {
  const t = useTranslations("super.cmsEditor.pages");
  return (
    <SuperLayout title={t("blog.title")} subtitle={t("blog.subtitle")}>
      <BlogPageEditor />
    </SuperLayout>
  );
};
export default CmsBlog;
