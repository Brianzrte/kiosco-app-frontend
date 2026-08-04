/**
 * Builds the server-side query for the POS manual product search. Callers
 * provide a non-empty, already-trimmed term; empty terms do not query.
 */
export function buildPosSearchQuery(term: string): string {
  const params = new URLSearchParams();
  params.set("q", term);
  params.set("active", "true");
  params.set("limit", "8");
  return params.toString();
}
