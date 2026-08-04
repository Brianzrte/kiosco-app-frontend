"use client";

import { ButtonHTMLAttributes, forwardRef, useEffect, useState } from "react";
import { MOTION } from "@/lib/motion";
import { Spinner } from "./Spinner";

type Variant =
  "primary" | "secondary" | "danger" | "success" | "confirm" | "ghost";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-text-inverse hover:bg-primary-hover disabled:bg-text-disabled",
  secondary:
    "bg-surface text-text-primary border border-border hover:border-border-hover disabled:text-text-disabled",
  danger:
    "bg-error text-text-inverse hover:bg-error/90 disabled:bg-text-disabled",
  // text-text-primary, not text-text-inverse: #22c55e is too light for
  // white text to reach WCAG AA (~2.3:1). Dark text gets ~6.4:1.
  success:
    "bg-success text-text-primary hover:bg-success/90 disabled:bg-text-disabled",
  // Dedicated to the POS sale-confirmation button. Deliberately NOT named
  // "success" and NOT backed by --color-success: that token is a generic,
  // brighter green reused by Toast/Badge/inventory deltas, and reusing it
  // here read as an unrelated candy-green plugin next to the payment chips
  // (see globals.css, "POS payment accents"). --color-confirm-sale (#34653c,
  // OKLCH L≈0.46) is dark enough for white text to clear WCAG AA
  // (~6.8:1; ~5.4:1 at the /90 hover shade) unlike --color-success.
  confirm:
    "bg-confirm-sale text-text-inverse hover:bg-confirm-sale/90 disabled:bg-text-disabled",
  ghost:
    "bg-transparent text-primary hover:bg-primary-light disabled:text-text-disabled",
};

type Size = "md" | "sm";

// Regular padding by size, keyed the same as `Size`.
const sizes: Record<Size, string> = {
  md: "px-4 py-2.5 text-sm",
  sm: "px-3 py-1.5 text-sm",
};

// Square footprint for `iconOnly`, keyed the same as `Size`. Touch target
// stays >=44px (size-11) on the mobile-first default; the `md:` step down
// only applies with a mouse (pos-patterns.md, "target >=44px táctil").
const iconOnlySizes: Record<Size, string> = {
  md: "size-11 !p-0 md:size-10",
  sm: "size-9 !p-0 md:size-8",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  /** The action this button triggers is in flight. Disables the button and, after a short threshold, shows a spinner. */
  pending?: boolean;
  /** Show the spinner immediately instead of waiting for the threshold — reserved for the highest-consequence action (sale confirmation). */
  pendingImmediate?: boolean;
  size?: Size;
  /** Square footprint sized for a single icon, no visible label (still needs `aria-label`). Replaces the `size-11 !p-0 md:size-9` className overrides previously written ad hoc at each call site (PosView's quantity steppers). */
  iconOnly?: boolean;
  /** Keeps a touch-safe icon target on mobile while using the compact desktop density for controls embedded in operational rows. */
  compactDesktop?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      iconOnly = false,
      compactDesktop = false,
      className = "",
      pending = false,
      pendingImmediate = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) {
    // Reset the elapsed-delay flag whenever a pending cycle starts or ends,
    // computed during render (not in an effect) so a stale `true` from a
    // previous cycle never bypasses the threshold on the next one.
    const [prevPending, setPrevPending] = useState(pending);
    const [thresholdElapsed, setThresholdElapsed] = useState(false);
    if (pending !== prevPending) {
      setPrevPending(pending);
      if (thresholdElapsed) setThresholdElapsed(false);
    }

    useEffect(() => {
      if (!pending || pendingImmediate) return;
      const timer = setTimeout(
        () => setThresholdElapsed(true),
        MOTION.spinnerDelay,
      );
      return () => clearTimeout(timer);
    }, [pending, pendingImmediate]);

    const showSpinner = pending && (pendingImmediate || thresholdElapsed);

    return (
      <button
        ref={ref}
        disabled={disabled || pending}
        aria-busy={pending || undefined}
        className={`inline-flex items-center justify-center gap-2 rounded-app text-sm font-medium transition-[color,background-color,border-color,transform] duration-[var(--motion-fast)] ease-[var(--ease-standard)] active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${iconOnly ? iconOnlySizes[size] : sizes[size]} ${iconOnly && compactDesktop && size === "md" ? "md:size-9" : ""} ${variants[variant]} ${className}`}
        {...props}
      >
        {showSpinner && <Spinner />}
        {children}
      </button>
    );
  },
);
