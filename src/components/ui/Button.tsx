import { ButtonHTMLAttributes } from "react";

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

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-app px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
