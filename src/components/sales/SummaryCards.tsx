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

  return (
    // A 3-column base keeps five compact tiles to two rows on phones. The
    // fifth tile fills the remaining two columns until xl, where all five
    // tiles fit in a single row. gap-2 on the smallest phones gives each
    // ~110px-wide tile a little more content width for its money value
    // (StatCard's "compact" size); md/xl keep the original gap.
    <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 xl:grid-cols-5">
      <StatCard
        size="compact"
        tone="summary-sales"
        label={salesLabel}
        value={data.total_sales}
        icon={<IconCart className="size-4.5" />}
      />
      <StatCard
        size="compact"
        tone="summary-total"
        label="Total facturado"
        value={formatMoney(data.total_amount)}
        icon={<IconChart className="size-4.5" />}
      />
      <StatCard
        size="compact"
        tone="payment-cash"
        label="Efectivo"
        value={formatMoney(byMethod.CASH.totalAmount)}
        icon={<IconCash className="size-4.5" />}
      />
      <StatCard
        size="compact"
        tone="payment-card"
        label="Tarjeta"
        value={formatMoney(byMethod.CARD.totalAmount)}
        icon={<IconCardPay className="size-4.5" />}
      />
      <StatCard
        size="compact"
        tone="payment-transfer"
        className="col-span-2 xl:col-span-1"
        label="Transferencia"
        value={formatMoney(byMethod.TRANSFER.totalAmount)}
        icon={<IconTransfer className="size-4.5" />}
      />
    </div>
  );
}
