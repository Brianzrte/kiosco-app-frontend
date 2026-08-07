import { Skeleton } from "@/components/ui/states";

/** Skeleton del hub mientras se resuelve el segmento principal de Egresos. */
export default function ExpensesLoading() {
  return (
    <div role="status" aria-label="Cargando egresos" className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-11 w-44" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-24" />
      <Skeleton className="h-72" />
    </div>
  );
}
