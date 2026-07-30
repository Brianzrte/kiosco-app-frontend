import { fromCents, toCents } from "./money";

/** The same decimal-string contract the backend accepts for counted cash. */
export function isCountedCash(value: string): boolean {
  return /^\d+(?:\.\d{1,2})?$/.test(value);
}

/** Returns counted minus expected using integer cents, never floating point. */
export function cashDifference(
  expectedCash: string,
  countedCash: string,
): string | null {
  if (!isCountedCash(countedCash)) return null;
  return fromCents(toCents(countedCash) - toCents(expectedCash));
}
