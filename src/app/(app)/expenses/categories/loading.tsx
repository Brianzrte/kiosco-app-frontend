import { Skeleton } from "@/components/ui/states";

/** Skeleton de rubros: encabezado, alta y lista. */
export default function ExpenseCategoriesLoading() {
  return (
    <div role="status" aria-label="Cargando rubros" className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div className="min-w-0 space-y-2"><Skeleton className="h-8 w-28 max-w-full" /><Skeleton className="h-4 w-80 max-w-full" /></div><Skeleton className="h-11 w-40 max-w-full self-start md:self-auto" /></div>
      <div className="max-w-xl rounded-app border border-border bg-surface p-6 shadow-soft"><Skeleton className="h-16" /></div>
      <div className="max-w-xl space-y-px overflow-hidden rounded-app border border-border bg-surface shadow-soft"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
    </div>
  );
}
