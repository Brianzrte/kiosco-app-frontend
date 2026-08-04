import { fromCents, toCents } from "./money";
import {
  calculateWeightedPrice,
  effectiveLinePrice,
  isValidWeight,
} from "./weightPricing";
import type { Product } from "./types";

/**
 * A single POS cart line. `weightError` lives per line (design.md, Decisión
 * 3) so an invalid weight in one `pesable` line never paints another line as
 * errored. `calculatedPrice` is `undefined` whenever there is no valid
 * subtotal yet for a `pesable` line (empty weight, or a weight currently
 * invalid) — see `updateLineWeight` below.
 */
export type CartLine = {
  product: Product;
  quantity: number;
  weight?: string;
  weightError?: string | null;
  calculatedPrice?: string;
  actualPrice?: string;
};

export const WEIGHT_ERROR_MESSAGE =
  "Ingresá un peso mayor a cero con hasta tres decimales.";

/**
 * Adds a `unitario` product to the cart, or increments its quantity if a
 * line for it already exists. Never awaits a stock check: the line is
 * visible immediately (design.md, Decisión 2); the stock cap is applied
 * separately by `applyStockCap` once the stock request resolves.
 */
export function addOrIncrementUnitLine(
  cart: readonly CartLine[],
  product: Product,
): CartLine[] {
  const existing = cart.find((line) => line.product.id === product.id);
  if (existing) {
    return cart.map((line) =>
      line.product.id === product.id
        ? { ...line, quantity: line.quantity + 1 }
        : line,
    );
  }
  return [...cart, { product, quantity: 1 }];
}

/** Removes every cart line for a product that has become unavailable. */
export function removeCartLine(
  cart: readonly CartLine[],
  productId: string,
): CartLine[] {
  return cart.filter((line) => line.product.id !== productId);
}

export function stockLimitMessage(
  productName: string,
  available: number,
): string {
  return available === 0
    ? `“${productName}” no tiene stock disponible.`
    : `Solo hay ${available} unidad${available === 1 ? "" : "es"} disponible${
        available === 1 ? "" : "s"
      } de “${productName}”.`;
}

export type StockCapResult = {
  cart: CartLine[];
  message: string | null;
};

/**
 * Caps a line's quantity to the available stock once the stock request for
 * it resolves, evaluated against whatever the cart holds for that product
 * *right now* (the caller is expected to read this against the live cart via
 * a functional `setCart` update, never a snapshot captured before the
 * request started — design.md, Decisión 1). A line whose quantity is already
 * within the available stock is returned unchanged, with no message.
 */
export function applyStockCap(
  cart: readonly CartLine[],
  productId: string,
  available: number,
): StockCapResult {
  const line = cart.find((l) => l.product.id === productId);
  if (!line || line.quantity <= available) {
    return { cart: [...cart], message: null };
  }
  return {
    cart: cart.map((l) =>
      l.product.id === productId ? { ...l, quantity: available } : l,
    ),
    message: stockLimitMessage(line.product.name, available),
  };
}

/**
 * Updates a `pesable` line's weight. An invalid weight never leaves a stale
 * `calculatedPrice` behind (design.md, Decisión 4): the line's subtotal
 * becomes "not currently valid" (`calculatedPrice: undefined`) until the
 * weight is corrected, at which point the price is recalculated only from
 * that new value.
 */
export function updateLineWeight(
  cart: readonly CartLine[],
  productId: string,
  value: string,
  pricePerKg: string,
): CartLine[] {
  if (!isValidWeight(value)) {
    return cart.map((line) =>
      line.product.id === productId
        ? {
            ...line,
            weight: value,
            weightError: WEIGHT_ERROR_MESSAGE,
            calculatedPrice: undefined,
            actualPrice: undefined,
          }
        : line,
    );
  }
  return cart.map((line) =>
    line.product.id === productId
      ? {
          ...line,
          weight: value,
          weightError: null,
          calculatedPrice: calculateWeightedPrice(value, pricePerKg),
          actualPrice: undefined,
        }
      : line,
  );
}

/**
 * Adds a new `pesable` line with an empty weight (no separate panel —
 * design.md, Decisión 5), or is a no-op if a line for the product already
 * exists (the caller focuses that existing line's weight input instead).
 */
export function addEmptyWeightLine(
  cart: readonly CartLine[],
  product: Product,
): CartLine[] {
  if (cart.some((line) => line.product.id === product.id)) return [...cart];
  return [...cart, { product, quantity: 0 }];
}

/**
 * Decimal-safe total in cents. A `pesable` line with no valid subtotal
 * (`calculatedPrice` undefined and quantity 0) naturally contributes zero,
 * matching "excluded from the total while invalid".
 */
export function cartTotalCents(cart: readonly CartLine[]): number {
  return cart.reduce((sum, line) => {
    const calculated =
      line.calculatedPrice ??
      fromCents(toCents(line.product.price) * line.quantity);
    return sum + toCents(effectiveLinePrice(calculated, line.actualPrice));
  }, 0);
}

export type CartSummary = {
  lineCount: number;
  unitCount: number;
  hasUnitLines: boolean;
  /** Sum of every valid `pesable` line's weight, in kilograms. */
  weightKg: number;
  hasWeighableLines: boolean;
};

function weightThousandths(value: string): number {
  const [units, fraction = ""] = value.split(".");
  return Number(units) * 1000 + Number((fraction + "000").slice(0, 3));
}

/**
 * Real quantity sold, not just the number of lines (design.md, Decisión 9):
 * lines, plus units for `unitario` lines and kilograms for `pesable` lines,
 * counted separately since they are different magnitudes.
 */
export function summarizeCart(cart: readonly CartLine[]): CartSummary {
  const unitLines = cart.filter((line) => line.product.unit_type !== "pesable");
  const weighableLines = cart.filter(
    (line) => line.product.unit_type === "pesable",
  );
  const unitCount = unitLines.reduce((sum, line) => sum + line.quantity, 0);
  const weightThousandthsTotal = weighableLines.reduce(
    (sum, line) =>
      sum + (line.weight && isValidWeight(line.weight)
        ? weightThousandths(line.weight)
        : 0),
    0,
  );
  return {
    lineCount: cart.length,
    unitCount,
    hasUnitLines: unitLines.length > 0,
    weightKg: weightThousandthsTotal / 1000,
    hasWeighableLines: weighableLines.length > 0,
  };
}
