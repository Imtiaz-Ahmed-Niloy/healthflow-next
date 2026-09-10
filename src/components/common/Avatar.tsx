"use client";

import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

/**
 * Somebody's picture, or their initials.
 *
 * Every topbar used to hardcode a stock portrait — /assets/patient-eleanor.jpg
 * on both patient and doctor layouts — so uploading a profile picture changed
 * the profile page and nothing else. The admin and super panels drew initials
 * instead, which was honest but inconsistent.
 *
 * `src` takes whatever the column holds: an R2 key from an upload, or the
 * absolute URL an identity provider gave us. mediaUrl tells them apart.
 */
export const Avatar = ({
  src,
  name,
  className = "h-10 w-10",
}: {
  src: string | null | undefined;
  name: string;
  className?: string;
}) => {
  const url = mediaUrl(src);

  // "Dr. Rahim Uddin" is RU, not DR: a part ending in a dot is a title or an
  // abbreviation (Dr., Prof., Md.), not a name.
  const parts = name.trim().split(/\s+/);
  const nameParts = parts.filter(part => !part.endsWith("."));

  const initials = (nameParts.length ? nameParts : parts)
    .map(part => part[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        loading="lazy"
        className={cn("rounded-full object-cover bg-muted", className)}
      />
    );
  }

  return (
    <div
      aria-label={name}
      className={cn("rounded-full bg-gradient-dark grid place-items-center text-surface-dark-foreground text-xs font-bold shrink-0", className)}
    >
      {initials}
    </div>
  );
};
