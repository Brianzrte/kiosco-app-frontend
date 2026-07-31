import { computePageSize } from "./pagination";

export const PRODUCTS_MIN_PAGE_SIZE = 5;
export const PRODUCTS_MAX_PAGE_SIZE = 15;
export const PRODUCTS_DEFAULT_PAGE_SIZE = 15;

export function computeProductsPageSize(opts: {
  viewportHeight: number;
  listTop: number;
  rowHeight: number;
  reservedBelow: number;
}): number {
  return computePageSize({
    ...opts,
    min: PRODUCTS_MIN_PAGE_SIZE,
    max: PRODUCTS_MAX_PAGE_SIZE,
    fallback: PRODUCTS_DEFAULT_PAGE_SIZE,
  });
}
