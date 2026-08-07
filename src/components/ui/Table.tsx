import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

export function Table({
  className = "",
  density = "default",
  ...props
}: HTMLAttributes<HTMLTableElement> & { density?: "default" | "compact" }) {
  return (
    <div
      className={`overflow-x-auto rounded-app border border-border bg-surface shadow-soft ${density === "compact" ? "text-xs" : ""} ${className}`}
    >
      <table
        className={`w-full text-left ${density === "compact" ? "text-xs" : "text-sm"} [&_tbody_tr:not(:last-child)_td]:border-b [&_tbody_tr:not(:last-child)_td]:border-border`}
        {...props}
      />
    </div>
  );
}

export function Th({
  compact = false,
  className = "",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { compact?: boolean }) {
  return (
    <th
      className={`border-b border-border-strong bg-surface-subtle ${compact ? "px-3 py-2" : "px-4 py-3"} text-xs font-semibold uppercase tracking-wide text-text-secondary first:rounded-tl-app last:rounded-tr-app ${className}`}
      {...props}
    />
  );
}

export function Td({
  compact = false,
  className = "",
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { compact?: boolean }) {
  return (
    <td
      className={`${compact ? "px-3 py-2" : "px-4 py-3"} ${className}`}
      {...props}
    />
  );
}
