import { Skeleton } from "@/components/ui/states";

/** Skeleton de sueldos: encabezado, controles de período y carga de horas. */
export default function PayrollLoading() {
  return (
    <div role="status" aria-label="Cargando sueldos" className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div className="min-w-0 space-y-2"><Skeleton className="h-8 w-28 max-w-full" /><Skeleton className="h-4 w-80 max-w-full" /></div><Skeleton className="h-11 w-40 max-w-full self-start md:self-auto" /></div>
      <div className="space-y-4 rounded-app border border-border bg-surface p-6 shadow-soft"><Skeleton className="h-5 w-52" /><div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div></div>
      <div className="space-y-4 rounded-app border border-border bg-surface p-6 shadow-soft"><Skeleton className="h-6 w-36" /><Skeleton className="h-36" /></div>
    </div>
  );
}
