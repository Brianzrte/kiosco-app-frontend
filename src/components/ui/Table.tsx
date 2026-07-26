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
      className={`border-b border-border px-4 py-3 text-xs font-medium uppercase tracking-wide text-text-secondary ${className}`}
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
