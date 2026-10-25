"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RemindersRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/pharmacy/notifications");
  }, [router]);

  return (
    <div className="py-12 text-center text-slate-500 text-sm">
      Loading reminders...
    </div>
  );
}

