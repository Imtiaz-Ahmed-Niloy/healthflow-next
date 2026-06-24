'use client';
import { SuperLayout } from "@/components/super/SuperLayout";
import FeaturesPageEditor from "@/components/super/FeaturesPageEditor";

const CmsFeatures = () => (
  <SuperLayout title="Features Page" subtitle="Edit every section shown on /features">
    <FeaturesPageEditor />
  </SuperLayout>
);
export default CmsFeatures;
