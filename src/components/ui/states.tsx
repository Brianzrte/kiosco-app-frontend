"use client";

import { ReactNode } from "react";
import { ApiError } from "@/lib/api";
import { Button } from "./Button";
import { Spinner } from "./Spinner";
import { IconAlert, IconBox } from "./icons";

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
export function ListSkeleton({
  rows = 6,
  announce = true,
}: {
  rows?: number;
  /** Parent loading regions provide the single live announcement when false. */
  announce?: boolean;
}) {
  return (
    <div
      {...(announce ? { role: "status", "aria-label": "Cargando…" } : { "aria-hidden": true })}
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

/** Administrative list placeholder: keeps header, KPI, filter and table space
 * stable until the screen's data view is ready. */
export function AdminListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Cargando…" className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-11 w-36 max-w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <div className="rounded-app border border-border bg-surface-subtle p-4">
        <Skeleton className="h-11 w-full md:w-72" />
      </div>
      <ListSkeleton rows={rows} announce={false} />
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
      <span
        aria-hidden
        className="flex size-11 items-center justify-center rounded-full bg-surface-subtle text-text-muted"
      >
        <IconBox className="size-5" />
      </span>
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
    <div
      role="alert"
      className="flex flex-col items-center gap-4 py-16 text-center"
    >
      <span
        aria-hidden
        className="flex size-11 items-center justify-center rounded-full bg-error/10 text-error"
      >
        <IconAlert className="size-5" />
      </span>
      <p className="text-sm font-medium text-error">{error.message}</p>
      <RecoveryAction error={error} onRetry={onRetry} />
    </div>
  );
}
