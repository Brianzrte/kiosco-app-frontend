/**
 * Money arrives from the backend as decimal strings ("12.50").
 * All arithmetic happens in integer cents — never floats.
 */

export function toCents(decimal: string): number {
  const [units, fraction = ""] = decimal.split(".");
  const cents = (fraction + "00").slice(0, 2);
  const sign = units.startsWith("-") ? -1 : 1;
  return sign * (Math.abs(parseInt(units || "0", 10)) * 100 + parseInt(cents, 10));
}

export function fromCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export function formatMoney(decimal: string): string {
  return `$ ${decimal}`;
}
