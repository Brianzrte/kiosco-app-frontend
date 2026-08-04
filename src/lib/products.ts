import { computePageSize } from "./pagination";
import { formatMoney, fromCents, subtractMoney, toCents } from "./money";
import type { Role } from "./types";

export function getLastCartLineProductId(
  cart: readonly { product: { id: string } }[],
): string | null {
  return cart.length > 0 ? cart[cart.length - 1].product.id : null;
}

export function canInitializeStockFromPos(roles: readonly Role[]): boolean {
  return roles.some((role) =>
    ["inventory", "receiving", "admin"].includes(role),
  );
}

export const PRODUCTS_MIN_PAGE_SIZE = 5;
export const PRODUCTS_MAX_PAGE_SIZE = 15;
export const PRODUCTS_DEFAULT_PAGE_SIZE = 15;

const DEFAULT_MARGIN_PERCENT_FALLBACK = 35;
const configuredDefaultMarginPercentValue =
  process.env.NEXT_PUBLIC_DEFAULT_MARGIN_PERCENT;
const configuredDefaultMarginPercent =
  configuredDefaultMarginPercentValue?.trim() === ""
    ? Number.NaN
    : Number(configuredDefaultMarginPercentValue);
export const DEFAULT_MARGIN_PERCENT = Number.isFinite(
  configuredDefaultMarginPercent,
)
  ? configuredDefaultMarginPercent
  : DEFAULT_MARGIN_PERCENT_FALLBACK;

const MONEY_PATTERN = /^-?\d+(\.\d{1,2})?$/;

function isValidMoney(value: string): boolean {
  return MONEY_PATTERN.test(value);
}

export function roundPriceToSuggestedAmount(price: string): string {
  if (!isValidMoney(price) || toCents(price) < 0) return price;

  const roundedPesos = Math.ceil(toCents(price) / 5000) * 50;
  return String(Math.max(5, roundedPesos));
}

export function computeSalePriceFromCost(
  cost: string,
  percent: number,
): string | null {
  if (!isValidMoney(cost) || toCents(cost) <= 0 || !Number.isFinite(percent)) {
    return null;
  }

  const salePriceCents = toCents(cost) * (1 + percent / 100);
  return roundPriceToSuggestedAmount(String(Math.round(salePriceCents) / 100));
}

export function computeCostFromSalePrice(
  price: string,
  percent: number,
): string | null {
  if (!isValidMoney(price) || toCents(price) <= 0 || !Number.isFinite(percent)) {
    return null;
  }

  const multiplier = 1 + percent / 100;
  if (multiplier <= 0) return null;

  return fromCents(Math.round(toCents(price) / multiplier));
}

export function hasMinimumSalePriceDigits(price: string): boolean {
  return price.replace(/\D/g, "").length >= 3;
}

export function computePercentFromPrices(
  cost: string,
  price: string,
): number | null {
  if (!isValidMoney(cost) || !isValidMoney(price) || toCents(cost) <= 0) {
    return null;
  }

  return Math.round(((toCents(price) - toCents(cost)) / toCents(cost)) * 100);
}

export function computeMarginAmount(cost: string, price: string): string | null {
  if (!isValidMoney(cost) || !isValidMoney(price) || toCents(cost) <= 0) {
    return null;
  }

  return subtractMoney(price, cost);
}

export function computeUnitSalePrice(
  packagePrice: string,
  unitsPerPackage: number,
  extraMarginPercent: number,
): string | null {
  if (
    !isValidMoney(packagePrice) ||
    toCents(packagePrice) < 0 ||
    !Number.isInteger(unitsPerPackage) ||
    unitsPerPackage < 2 ||
    !Number.isFinite(extraMarginPercent) ||
    extraMarginPercent < 0
  ) {
    return null;
  }

  const unitPriceCents = Math.round(
    (toCents(packagePrice) / unitsPerPackage) *
      (1 + extraMarginPercent / 100),
  );
  return roundPriceToSuggestedAmount(fromCents(unitPriceCents));
}

export function computeExtraMarginPercent(
  packagePrice: string,
  unitsPerPackage: number,
  unitPrice: string,
): number | null {
  if (
    !isValidMoney(packagePrice) ||
    !isValidMoney(unitPrice) ||
    toCents(packagePrice) <= 0 ||
    !Number.isInteger(unitsPerPackage) ||
    unitsPerPackage < 2
  ) {
    return null;
  }

  const baseUnitPriceCents = toCents(packagePrice) / unitsPerPackage;
  if (baseUnitPriceCents === 0) return null;

  return Math.round(
    ((toCents(unitPrice) / baseUnitPriceCents - 1) * 100) * 100,
  ) / 100;
}

export function formatUnitSaleCalculation(
  packagePrice: string,
  unitsPerPackage: number,
  extraMarginPercent: number,
  unitPrice: string,
): string | null {
  if (
    !isValidMoney(packagePrice) ||
    !isValidMoney(unitPrice) ||
    !Number.isInteger(unitsPerPackage) ||
    unitsPerPackage < 2 ||
    !Number.isFinite(extraMarginPercent)
  ) {
    return null;
  }

  return `Base: ${formatMoney(fromCents(Math.round(toCents(packagePrice) / unitsPerPackage)))} · +${extraMarginPercent}% = ${formatMoney(unitPrice)}`;
}

export function deriveUnitProductName(packageName: string): string {
  return `${packageName.trimEnd()} (unidad)`;
}

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
