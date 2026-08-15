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

  /**
   * null until the client has mounted.
   *
   * Seeding this with `new Date()` ran on the server too, so the server sent
   * one timestamp and the client hydrated with another — React reported it as
   * a hydration mismatch on every page carrying the header. A clock has no
   * correct server value, so nothing time-derived renders until the client
   * owns it, and a placeholder holds the space until then.
   */
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time =
    now &&
    new Intl.DateTimeFormat("en-US", {
      timeZone: settings.timezone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(now);

  const date = now && formatDate(now, settings);

  return (
    <div
      className={`hidden md:flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground/80 ${className}`}
      // The date is time-derived too, so it waits for the client as well.
      title={date ? `${date} • ${settings.timezone}` : settings.timezone}
    >
      <Clock className="h-3.5 w-3.5 text-primary" />
      <span className="font-mono tabular-nums tracking-tight text-primary font-semibold">
        {/* Widths match the rendered strings so the header does not jump. */}
        {time ?? <Placeholder className="w-[70px] bg-primary/20" />}
      </span>
      {!compact && <span className="text-muted-foreground">•</span>}
      {!compact && (
        <span className="text-muted-foreground">
          {date ?? <Placeholder className="w-[76px] bg-muted-foreground/20" />}
        </span>
      )}
    </div>
  );
};

const Placeholder = ({ className }: { className: string }) => (
  <span
    aria-hidden="true"
    className={`inline-block h-3 align-middle rounded animate-pulse ${className}`}
  />
);

export default HeaderClock;

