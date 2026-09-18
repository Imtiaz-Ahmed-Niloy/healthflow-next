"use client";

import { useTranslations } from "next-intl";
import { SuperLayout } from "@/components/super/SuperLayout";
import ContactPageEditor from "@/components/super/ContactPageEditor";

const CmsContact = () => {
  const t = useTranslations("super.cmsEditor.pages");
  return (
    <SuperLayout title={t("contact.title")} subtitle={t("contact.subtitle")}>
      <ContactPageEditor />
    </SuperLayout>
  );
};
export default CmsContact;
