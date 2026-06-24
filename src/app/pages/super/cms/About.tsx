'use client';
import { SuperLayout } from "@/components/super/SuperLayout";
import AboutPageEditor from "@/components/super/AboutPageEditor";

const CmsAbout = () => (
  <SuperLayout title="About Page" subtitle="Edit every section shown on /about">
    <AboutPageEditor />
  </SuperLayout>
);
export default CmsAbout;
