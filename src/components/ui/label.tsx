"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const labelVariants = cva("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70");

/**
 * The one label in the app.
 *
 * `required` renders the asterisk and nothing else — it does NOT make the input
 * required. The `required` attribute still belongs on the input, which is what
 * the browser validates and what screen readers announce. Passing it here as
 * well is deliberate duplication: a form where the two disagree is a form that
 * lies to the person filling it in, and having both in one call site makes that
 * disagreement visible in review.
 *
 * The asterisk is aria-hidden for that reason. The input's own `required`
 * already announces it, and a second announcement reads as "star" in the middle
 * of the field name.
 */
const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants> & {
      /** Show the required asterisk. Default false — most fields are optional. */
      required?: boolean;
    }
>(({ className, required = false, children, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props}>
    {children}
    {required && (
      <span aria-hidden="true" className="text-destructive ml-0.5">
        *
      </span>
    )}
  </LabelPrimitive.Root>
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
