"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "./api";

/**
 * Data loading with explicit loading/error states and retry.
 * `fetcher` must be referentially stable (useCallback). When the query
 * depends on changing inputs, remount the component with a `key` instead.
 */
export function useLoad<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetcher()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(
          e instanceof ApiError
            ? e
            : new ApiError(0, "Ocurrió un error inesperado.", "message"),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher, tick]);

  const reload = useCallback(() => {
    setData(null);
    setError(null);
    setTick((t) => t + 1);
  }, []);

  return { data, error, reload };
}
