import { HTMLAttributes } from "react";

export function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-app border border-border bg-surface p-6 shadow-soft ${className}`}
      {...props}
    />
  );
}
