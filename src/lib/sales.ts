import { Tone } from "@/components/ui/Badge";
import { computePageSize } from "@/lib/pagination";
import { SalePayment } from "@/lib/types";

export const SALES_MIN_PAGE_SIZE = 5;
export const SALES_MAX_PAGE_SIZE = 15;
export const SALES_DEFAULT_PAGE_SIZE = 15;

export function computeSalesPageSize(opts: {
  viewportHeight: number;
  listTop: number;
  rowHeight: number;
  reservedBelow: number;
}): number {
  return computePageSize({
    ...opts,
    min: SALES_MIN_PAGE_SIZE,
    max: SALES_MAX_PAGE_SIZE,
    fallback: SALES_DEFAULT_PAGE_SIZE,
  });
}

export function paymentMethodTone(method: SalePayment["method"]): Tone {
  switch (method) {
    case "CASH":
      return "payment-cash";
    case "CARD":
      return "payment-card";
    case "TRANSFER":
      return "payment-transfer";
  }
}
