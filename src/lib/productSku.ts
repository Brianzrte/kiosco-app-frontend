export const AUTOMATIC_SKU_PATTERN = /^SKU-\d{3}$/;

export function isAutomaticSku(sku: string): boolean {
  return AUTOMATIC_SKU_PATTERN.test(sku);
}

export function canApplySkuSuggestion(
  manuallyEdited: boolean,
): boolean {
  return !manuallyEdited;
}
