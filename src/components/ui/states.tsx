import { ReactNode } from "react";
import { Button } from "./Button";

export function LoadingState({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-text-secondary">
      <span
        aria-hidden
        className="size-4 animate-spin rounded-full border-2 border-border border-t-primary"
      />
      {label}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-app bg-surface-2 ${className}`}
    />
  );
}

/** Placeholder shaped like a list/table while rows load. */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-label="Cargando…"
      className="overflow-hidden rounded-app border border-border bg-surface shadow-soft"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-b-0"
        >
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-4 w-1/5" />
          <Skeleton className="ml-auto h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  message,
  action,
}: {
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-sm text-text-secondary">{message}</p>
      {action}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-sm font-medium text-error">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  );
}
