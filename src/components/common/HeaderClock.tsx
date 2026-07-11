"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { useAppSettings, formatDate } from "@/lib/appSettings";

interface Props {
  className?: string;
  compact?: boolean;
}

export const HeaderClock = ({ className = "", compact = false }: Props) => {
  const settings = useAppSettings();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: settings.timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(now);

  const date = formatDate(now, settings);

  return (
    <div
      className={`hidden md:flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground/80 ${className}`}
      title={`${date} • ${settings.timezone}`}
    >
      <Clock className="h-3.5 w-3.5 text-primary" />
      <span className="font-mono tabular-nums tracking-tight text-primary font-semibold">{time}</span>
      {!compact && <span className="text-muted-foreground">•</span>}
      {!compact && <span className="text-muted-foreground">{date}</span>}
    </div>
  );
};

export default HeaderClock;

