"use client";

import { SuperLayout } from "@/components/super/SuperLayout";
import BlogPageEditor from "@/components/super/BlogPageEditor";

const CmsBlog = () => (
  <SuperLayout title="Blog Page" subtitle="Edit masthead, sections, articles and newsletter shown on /blog">
    <BlogPageEditor />
  </SuperLayout>
);
export default CmsBlog;

