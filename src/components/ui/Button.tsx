"use client";

import { ButtonHTMLAttributes, useEffect, useState } from "react";
import { MOTION } from "@/lib/motion";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-text-inverse hover:bg-primary-hover disabled:bg-text-disabled",
  secondary:
    "bg-surface text-text-primary border border-border hover:border-border-hover disabled:text-text-disabled",
  danger:
    "bg-error text-text-inverse hover:bg-error/90 disabled:bg-text-disabled",
  ghost:
    "bg-transparent text-primary hover:bg-primary-light disabled:text-text-disabled",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  /** The action this button triggers is in flight. Disables the button and, after a short threshold, shows a spinner. */
  pending?: boolean;
  /** Show the spinner immediately instead of waiting for the threshold — reserved for the highest-consequence action (sale confirmation). */
  pendingImmediate?: boolean;
};

export function Button({
  variant = "primary",
  className = "",
  pending = false,
  pendingImmediate = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
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
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-app px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {showSpinner && <Spinner />}
      {children}
    </button>
  );
}
