"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

/** Fades in the entering section only; the outgoing view is never animated out. */
export function SectionTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="section-enter">
      {children}
    </div>
  );
}
