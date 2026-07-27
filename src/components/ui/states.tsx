"use client";

import { ReactNode } from "react";
import { ApiError } from "@/lib/api";
import { Button } from "./Button";
import { Spinner } from "./Spinner";

export function LoadingState({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-text-secondary">
      <Spinner className="text-primary" />
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

/**
 * Recovery action for an error state, chosen by `error.kind`:
 * forbidden → go back, unauthorized → sign in again, everything else → retry.
 * A `401` normally never reaches here (the client redirects on it), but the
 * fallback is kept for the moment before that redirect lands.
 */
function RecoveryAction({
  error,
  onRetry,
}: {
  error: ApiError;
  onRetry?: () => void;
}) {
  if (error.kind === "forbidden") {
    return (
      <Button variant="secondary" onClick={() => window.history.back()}>
        Volver
      </Button>
    );
  }
  if (error.kind === "unauthorized") {
    return (
      <Button
        variant="secondary"
        onClick={() => window.location.assign("/login")}
      >
        Iniciar sesión
      </Button>
    );
  }
  if (onRetry) {
    return (
      <Button variant="secondary" onClick={onRetry}>
        Reintentar
      </Button>
    );
  }
  return null;
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: ApiError;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-sm font-medium text-error">{error.message}</p>
      <RecoveryAction error={error} onRetry={onRetry} />
    </div>
  );
}
