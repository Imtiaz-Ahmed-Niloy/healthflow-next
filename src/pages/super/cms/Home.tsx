"use client";

import { SuperLayout } from "@/components/super/SuperLayout";
import HomepageEditor from "@/components/super/HomepageEditor";

const CmsHome = () => (
  <SuperLayout title="Home Page" subtitle="Edit hero, stats and testimonials shown on /">
    <HomepageEditor />
  </SuperLayout>
);
export default CmsHome;

