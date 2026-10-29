"use client";

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type AutoGrowTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

/**
 * A one-line text box that grows a line at a time as the text wraps, like a
 * chat input. Keys are the caller's: it has no Enter handling of its own.
 */
export const AutoGrowTextarea = forwardRef<HTMLTextAreaElement, AutoGrowTextareaProps>(
  ({ className, value, ...props }, ref) => {
    const inner = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => inner.current as HTMLTextAreaElement);

    useLayoutEffect(() => {
      const el = inner.current;
      if (!el) return;
      el.style.height = "auto";
      // scrollHeight leaves out the border, which border-box height includes.
      el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
    }, [value]);

    return (
      <textarea
        ref={inner}
        rows={1}
        value={value}
        className={cn("resize-none overflow-hidden break-words", className)}
        {...props}
      />
    );
  },
);
AutoGrowTextarea.displayName = "AutoGrowTextarea";
