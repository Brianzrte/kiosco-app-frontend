"use client";

import { useEffect, useRef, useState } from "react";
import { computePageSize } from "./pagination";

export const VIEWPORT_PAGE_SIZE_MIN = 5;
export const VIEWPORT_PAGE_SIZE_MAX = 15;
export const VIEWPORT_PAGE_SIZE_DEFAULT = 15;
export const VIEWPORT_PAGE_SIZE_RESERVED_BELOW = 56;

export function useViewportPageSize(options: {
  itemCount: number;
  onPageReset: () => void;
  defaultPageSize?: number;
  minPageSize?: number;
  maxPageSize?: number;
  reservedBelow?: number;
}) {
  const {
    itemCount,
    onPageReset,
    defaultPageSize = VIEWPORT_PAGE_SIZE_DEFAULT,
    minPageSize = VIEWPORT_PAGE_SIZE_MIN,
    maxPageSize = VIEWPORT_PAGE_SIZE_MAX,
    reservedBelow = VIEWPORT_PAGE_SIZE_RESERVED_BELOW,
  } = options;
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const mobileListRef = useRef<HTMLUListElement | null>(null);
  const desktopListRef = useRef<HTMLDivElement | null>(null);
  const onPageResetRef = useRef(onPageReset);
  useEffect(() => {
    onPageResetRef.current = onPageReset;
  }, [onPageReset]);

  useEffect(() => {
    if (itemCount === 0) return;

    const recompute = () => {
      const mobileRect = mobileListRef.current?.getBoundingClientRect();
      const desktopRect = desktopListRef.current?.getBoundingClientRect();
      const listRect =
        mobileRect && mobileRect.height > 0
          ? mobileRect
          : desktopRect && desktopRect.height > 0
            ? desktopRect
            : undefined;
      if (!listRect) return;

      const nextPageSize = computePageSize({
        viewportHeight: window.innerHeight,
        listTop: listRect.top,
        rowHeight: listRect.height / itemCount,
        reservedBelow,
        min: minPageSize,
        max: maxPageSize,
        fallback: defaultPageSize,
      });
      if (nextPageSize === pageSize) return;
      setPageSize(nextPageSize);
      onPageResetRef.current();
    };

    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [defaultPageSize, itemCount, maxPageSize, minPageSize, pageSize, reservedBelow]);

  return { pageSize, mobileListRef, desktopListRef };
}
