"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "./api";

export function shouldPoll(
  visibilityState: DocumentVisibilityState | undefined,
): boolean {
  return visibilityState === undefined || visibilityState === "visible";
}

/**
 * Data loading with explicit loading/error states and retry.
 * `fetcher` must be referentially stable (useCallback). When the query
 * depends on changing inputs, remount the component with a `key` instead.
 */
export function useLoad<T>(
  fetcher: () => Promise<T>,
  { pollMs }: { pollMs?: number } = {},
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [tick, setTick] = useState(0);
  const silentRefreshRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const load = (isPoll = false) => {
      fetcher()
        .then((result) => {
          if (!cancelled) setData(result);
        })
        .catch((e: unknown) => {
          if (cancelled || isPoll) return;
          setError(
            e instanceof ApiError
              ? e
              : new ApiError(0, "Ocurrió un error inesperado.", "message"),
          );
        });
    };

    const isSilentRefresh = silentRefreshRef.current;
    silentRefreshRef.current = false;
    load(isSilentRefresh);
    if (pollMs === undefined) {
      return () => {
        cancelled = true;
      };
    }

    const interval = setInterval(() => {
      const visibilityState =
        typeof document === "undefined" ? undefined : document.visibilityState;
      if (shouldPoll(visibilityState)) load(true);
    }, pollMs);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fetcher, pollMs, tick]);

  const reload = useCallback(() => {
    setData(null);
    setError(null);
    setTick((t) => t + 1);
  }, []);

  const refresh = useCallback(() => {
    silentRefreshRef.current = true;
    setTick((t) => t + 1);
  }, []);

  return { data, error, reload, refresh };
}
