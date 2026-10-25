"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AnalyticsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/pharmacy/reports");
  }, [router]);

  return (
    <div className="py-12 text-center text-slate-500 text-sm">
      Loading analytics...
    </div>
  );
}

