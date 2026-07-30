import { HTMLAttributes } from "react";

export type Tone =
  | "pastel-pink"
  | "pastel-peach"
  | "pastel-yellow"
  | "pastel-green"
  | "pastel-blue"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral"
  | "payment-cash"
  | "payment-card"
  | "payment-transfer";

const tones: Record<Tone, string> = {
  "pastel-pink": "bg-pastel-pink text-text-primary",
  "pastel-peach": "bg-pastel-peach text-text-primary",
  "pastel-yellow": "bg-pastel-yellow text-text-primary",
  "pastel-green": "bg-pastel-green text-text-primary",
  "pastel-blue": "bg-pastel-blue text-text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  error: "bg-error/15 text-error",
  info: "bg-info/15 text-info",
  neutral: "bg-surface-2 text-text-secondary",
  "payment-cash": "bg-payment-cash text-text-primary",
  "payment-card": "bg-payment-card text-text-primary",
  "payment-transfer": "bg-payment-transfer text-text-primary",
};

const pastelTones: Tone[] = [
  "pastel-pink",
  "pastel-peach",
  "pastel-yellow",
  "pastel-green",
  "pastel-blue",
];

/** Stable pastel tone for an entity id (e.g. category badges). */
export function pastelFor(id: string): Tone {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return pastelTones[hash % pastelTones.length];
}

export function Badge({
  tone = "neutral",
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}
      {...props}
    />
  );
}
