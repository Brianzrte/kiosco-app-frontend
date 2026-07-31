import { StatCard } from "@/components/ui/StatCard";
import {
  IconCardPay,
  IconCart,
  IconCash,
  IconChart,
  IconTransfer,
} from "@/components/ui/icons";
import { formatMoney } from "@/lib/money";
import {
  normalizeByPaymentMethod,
  SalesSummaryByPaymentMethod,
} from "@/lib/salesSummary";

/**
 * Ventas / Total facturado / Efectivo / Tarjeta / Transferencia — shared by
 * `/sales` (Historial) and `/reports` so both screens read the same
 * payment-method breakdown the same way.
 */
export function SummaryCards({
  data,
  salesLabel = "Ventas",
}: {
  data: SalesSummaryByPaymentMethod;
  /** "Ventas hoy" on `/sales` (always today); the period-agnostic "Ventas" elsewhere (e.g. `/reports`, an arbitrary range). */
  salesLabel?: string;
}) {
  const byMethod = normalizeByPaymentMethod(data.by_payment_method);
  const mobileCardClass = "w-40 shrink-0 snap-start md:w-auto";

  return (
    <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 sm:gap-3 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:pb-0 xl:grid-cols-5">
      <StatCard
        size="compact"
        tone="summary-sales"
        className={mobileCardClass}
        label={salesLabel}
        value={data.total_sales}
        icon={<IconCart className="size-4.5" />}
      />
      <StatCard
        size="compact"
        tone="summary-total"
        className={mobileCardClass}
        label="Total facturado"
        value={formatMoney(data.total_amount)}
        icon={<IconChart className="size-4.5" />}
      />
      <StatCard
        size="compact"
        tone="payment-cash"
        className={mobileCardClass}
        label="Efectivo"
        value={formatMoney(byMethod.CASH.totalAmount)}
        icon={<IconCash className="size-4.5" />}
      />
      <StatCard
        size="compact"
        tone="payment-card"
        className={mobileCardClass}
        label="Tarjeta"
        value={formatMoney(byMethod.CARD.totalAmount)}
        icon={<IconCardPay className="size-4.5" />}
      />
      <StatCard
        size="compact"
        tone="payment-transfer"
        className={`${mobileCardClass} md:col-span-2 xl:col-span-1`}
        label="Transferencia"
        value={formatMoney(byMethod.TRANSFER.totalAmount)}
        icon={<IconTransfer className="size-4.5" />}
      />
    </div>
  );
}
