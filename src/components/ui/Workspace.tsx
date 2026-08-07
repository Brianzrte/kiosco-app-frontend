import { HTMLAttributes, ReactNode } from "react";

/**
 * Structural primitives for the authenticated ERP workspace. They deliberately
 * do not contain navigation or session logic: the shell composes them in the
 * next implementation stage while screens retain a single content region.
 */
export function Workspace({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`min-h-full bg-background ${className}`}
      {...props}
    />
  );
}

export function WorkspaceRail({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <aside
      className={`border-r border-border bg-surface shadow-soft ${className}`}
      {...props}
    >
      {children}
    </aside>
  );
}

export function WorkspaceContent({
  className = "",
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={`min-w-0 bg-background px-3 py-6 md:px-[var(--spacing-workspace)] md:py-[var(--spacing-workspace-wide)] ${className}`}
      {...props}
    />
  );
}

/** Shared administrative control band: filters/actions precede the data area. */
export function AdminToolbar({
  children,
  label = "Controles de la lista",
  className = "",
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <section
      aria-label={label}
      className={`flex flex-col gap-3 rounded-app border border-border bg-surface-subtle p-[var(--spacing-toolbar)] md:flex-row md:flex-wrap md:items-end ${className}`}
    >
      {children}
    </section>
  );
}
