import { fromCents, toCents } from "./money";

export function isValidWeight(value: string): boolean {
  return /^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/.test(value) &&
    weightThousandths(value) > 0;
}

/** Converts a valid kilogram string to integer thousandths. */
export function weightThousandths(value: string): number {
  const [units, fraction = ""] = value.split(".");
  return Number(units) * 1000 + Number((fraction + "000").slice(0, 3));
}

/** Calculates a weighted line total with integer thousandths and cents. */
export function calculateWeightedPrice(
  weight: string,
  pricePerKg: string,
): string {
  const weightedCents = weightThousandths(weight) * toCents(pricePerKg);
  return fromCents(Math.floor((weightedCents + 500) / 1000));
}

export function effectiveLinePrice(
  calculatedPrice: string,
  actualPrice?: string,
): string {
  return actualPrice ?? calculatedPrice;
}
