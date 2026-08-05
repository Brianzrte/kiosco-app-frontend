"use client";

import { Button } from "@/components/ui/Button";
import type { ErrorKind } from "@/lib/api";
import type { CheckoutStatusResult } from "@/lib/posStatus";

/**
 * Checkout region: renders exactly the single message `resolveCheckoutStatus`
 * picked (design.md, Decisión 10). No priority logic lives here — only
 * presentation, plus the recovery action for a confirmation error (Decisión
 * 11).
 */
export function CheckoutStatus({
  status,
  confirmErrorKind,
  onRetry,
  onGoBack,
}: {
  status: CheckoutStatusResult;
  confirmErrorKind: ErrorKind | null;
  onRetry: () => void;
  onGoBack: () => void;
}) {
  if (status.kind === "settled") {
    return (
      <p className="mb-2 text-center text-xs text-text-secondary">
        {status.message}
      </p>
    );
  }

  if (status.kind === "confirmError") {
    return (
      <div
        role="alert"
        className="mb-4 flex flex-col items-center gap-2 rounded-app border border-error/40 bg-error/10 px-3 py-2 text-center text-sm font-medium text-error"
      >
        <p>{status.message}</p>
        {confirmErrorKind === "forbidden" ? (
          <Button variant="secondary" size="sm" onClick={onGoBack}>
            Volver
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Reintentar
          </Button>
        )}
      </div>
    );
  }

  if (status.kind === "network") {
    return (
      <p className="mb-4 rounded-app border border-warning bg-surface px-3 py-2 text-sm text-warning">
        {status.message}
      </p>
    );
  }

  if (status.kind === "balance") {
    return (
      <p
        aria-live="polite"
        aria-atomic="true"
        className="mb-2 rounded-app border border-warning/40 bg-warning/10 px-3 py-2 text-center text-sm font-medium text-text-primary"
      >
        {status.message}
      </p>
    );
  }

  // "blocked"
  return (
    <p className="mb-2 text-center text-xs text-text-secondary">
      {status.message}
    </p>
  );
}
