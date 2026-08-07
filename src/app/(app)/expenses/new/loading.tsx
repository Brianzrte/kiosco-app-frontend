import { Skeleton } from "@/components/ui/states";

/** Skeleton de la estructura del formulario antes de cargar sus datos. */
export default function NewExpenseLoading() {
  return (
    <div role="status" aria-label="Cargando formulario de egreso" className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <Skeleton className="h-8 w-56 max-w-full min-w-0" />
        <Skeleton className="h-11 w-40 max-w-full self-start md:self-auto" />
      </div>
      <div className="max-w-3xl space-y-6 rounded-app border border-border bg-surface p-6 shadow-soft">
        <Skeleton className="h-5 w-16" />
        <div className="flex flex-wrap gap-2"><Skeleton className="h-11 w-28" /><Skeleton className="h-11 w-24" /><Skeleton className="h-11 w-32" /></div>
        <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
        <Skeleton className="h-24" />
      </div>
    </div>
  );
}
