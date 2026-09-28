"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * py-1 rather than shadcn's py-2: the input is a fixed h-10 and centres its
 * one line of text either way, but py-2 left the text 22px of room, and Hind
 * Siliguri's Bangla needs about 23px at text-sm and 26px at text-base (the
 * size below md) — "যেমন: 3" in the age and height fields was clipped along
 * the bottom. py-1 gives it 30px.
 *
 * leading-6 as well: the text itself sits in a box one line-height tall, and
 * that box clips too. At text-sm's 20px the tail of the "g" in "e.g. 64" was
 * cut off on a display scaled to 125%; 24px leaves it room. It is stated at md
 * too, because md:text-sm would otherwise put the 20px back.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm leading-6 md:leading-6",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

