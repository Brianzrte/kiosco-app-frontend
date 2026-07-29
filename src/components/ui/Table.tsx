import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

export function Table({
  className = "",
  ...props
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <div
      className={`overflow-x-auto rounded-app border border-border bg-surface shadow-soft ${className}`}
    >
      <table className="w-full text-left text-sm" {...props} />
    </div>
  );
}

export function Th({
  className = "",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`border-b border-border-strong bg-surface-subtle px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary first:rounded-tl-app last:rounded-tr-app ${className}`}
      {...props}
    />
  );
}

export function Td({
  className = "",
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={`border-b border-border px-4 py-3 last:border-b-0 ${className}`}
      {...props}
    />
  );
}
