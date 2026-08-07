"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

/** Routes that are `operational-pos` screens: entering them never animates,
 * since the cashier reloads/reenters them many times per shift. */
const NO_ENTER_TRANSITION_ROUTES = new Set(["/"]);

/** Fades in the entering section only; the outgoing view is never animated
 * out. Operational POS routes (see `NO_ENTER_TRANSITION_ROUTES`) are excluded
 * so reentering them never fades or shifts. */
export function SectionTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const skipTransition = NO_ENTER_TRANSITION_ROUTES.has(pathname);
  const isExpensesRoute =
    pathname === "/expenses" || pathname.startsWith("/expenses/");
  return (
    <div
      key={pathname}
      className={
        skipTransition
          ? undefined
          : isExpensesRoute
            ? "section-enter expenses-section-enter"
            : "section-enter"
      }
    >
      {children}
    </div>
  );
}
