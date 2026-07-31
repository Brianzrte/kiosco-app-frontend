export function computeTotalPages(total: number, limit: number): number {
  return Math.max(1, Math.ceil(total / limit));
}

export function pageWindow<T>(items: T[], page: number, limit: number): T[] {
  const start = Math.max(0, page - 1) * limit;
  return items.slice(start, start + limit);
}

export function computePageSize(opts: {
  viewportHeight: number;
  listTop: number;
  rowHeight: number;
  reservedBelow: number;
  min: number;
  max: number;
  fallback: number;
}): number {
  if (opts.rowHeight <= 0) return opts.fallback;
  const available = opts.viewportHeight - opts.listTop - opts.reservedBelow;
  const fit = Math.floor(available / opts.rowHeight);
  return Math.min(opts.max, Math.max(opts.min, fit));
}
