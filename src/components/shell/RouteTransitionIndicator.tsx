"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { CANCEL_EVENT, PENDING_EVENT } from "./useNavigationRouter";

function routeKey(url: string | URL | null | undefined) {
  if (!url) return null;
  const href = new URL(url, window.location.href);
  return href.origin === window.location.origin ? href.pathname + href.search : null;
}

function internalRouteKey(anchor: HTMLAnchorElement) {
  const href = new URL(anchor.href, window.location.href);
  const isInternal =
    href.origin === window.location.origin &&
    href.pathname + href.search + href.hash !==
      window.location.pathname + window.location.search + window.location.hash &&
    anchor.target !== "_blank" &&
    !anchor.hasAttribute("download");
  return isInternal ? routeKey(href) : null;
}

/**
 * Observes client-side route activations without taking ownership of router
 * calls. The indicator is an absolute overlay, so it neither blocks a local
 * pending operation nor changes the geometry or focus path of the workspace.
 */
export function RouteTransitionIndicator({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const currentRoute = `${pathname}${searchParams.size ? `?${searchParams}` : ""}`;
  const pending = pendingRoute !== null && pendingRoute !== currentRoute;

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (anchor instanceof HTMLAnchorElement) {
        const route = internalRouteKey(anchor);
        if (route) setPendingRoute(route);
      }
    }

    document.addEventListener("click", onClick, true);

    function onPending(event: Event) {
      const href = (event as CustomEvent<{ href?: string }>).detail?.href;
      const route = routeKey(href);
      if (route) setPendingRoute(route);
    }
    function onCancel() {
      setPendingRoute(null);
    }

    window.addEventListener(PENDING_EVENT, onPending);
    window.addEventListener(CANCEL_EVENT, onCancel);
    window.addEventListener("error", onCancel);
    window.addEventListener("unhandledrejection", onCancel);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(PENDING_EVENT, onPending);
      window.removeEventListener(CANCEL_EVENT, onCancel);
      window.removeEventListener("error", onCancel);
      window.removeEventListener("unhandledrejection", onCancel);
    };
  }, []);

  return (
    <div aria-busy={pending} className="relative min-h-full">
      {pending && (
        <div
          role="status"
          aria-live="polite"
          className="route-transition-indicator pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-end px-3 pt-2 md:px-4"
        >
          <span className="flex items-center gap-2 rounded-app border border-border bg-surface-raised px-3 py-2 text-xs font-medium text-text-secondary shadow-soft">
            <Spinner className="size-3 text-primary" />
            <span>Navegando…</span>
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
