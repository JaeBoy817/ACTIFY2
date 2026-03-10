import { Package } from "lucide-react";

import { GlowCard } from "@/components/dashboard/v4/GlowCard";
import { PremiumPillButton } from "@/components/dashboard/v4/PremiumPillButton";
import { formatCurrency } from "@/components/dashboard/v4/theme";
import type { DashboardCommandCenterSummary } from "@/lib/dashboard/getDashboardCommandCenterSummary";

export function DashboardInventoryCard({ summary }: { summary: DashboardCommandCenterSummary }) {
  return (
    <GlowCard
      title="Inventory / Prize Cart Pulse"
      subtitle="Budget + Stock"
      accent="rose"
      icon={<Package className="h-4 w-4" />}
      action={<PremiumPillButton label="Open Budget/Stock" href="/app/dashboard/budget-stock" tone="rose" />}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#2c395b] bg-[#111a2e] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8ea4cf]">Low stock items</p>
          <p className="mt-1 text-3xl font-black text-white">{summary.inventoryPulse.lowStockCount}</p>
        </div>
        <div className="rounded-2xl border border-[#2c395b] bg-[#111a2e] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8ea4cf]">Monthly spend</p>
          <p className="mt-1 text-3xl font-black text-white">{formatCurrency(summary.inventoryPulse.monthSpending)}</p>
        </div>
        <div className="rounded-2xl border border-[#2c395b] bg-[#111a2e] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8ea4cf]">Below threshold</p>
          <p className="mt-1 text-3xl font-black text-white">{summary.inventoryPulse.belowThresholdCount}</p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#2c395b] bg-[#10192d] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8ea4cf]">Low stock alerts</p>
          <div className="mt-2 space-y-2">
            {summary.inventoryPulse.lowStockItems.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#36486f] px-3 py-2 text-xs text-[#8ea3cd]">No low stock alerts.</p>
            ) : null}
            {summary.inventoryPulse.lowStockItems.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-[#2f3d64] bg-[#0f182a] px-3 py-2 text-sm">
                <span className="text-white">{item.name}</span>
                <span className="text-xs text-rose-200">{item.onHand} / {item.threshold}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#2c395b] bg-[#10192d] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8ea4cf]">Most used items this month</p>
          <div className="mt-2 space-y-2">
            {summary.inventoryPulse.mostUsedItems.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#36486f] px-3 py-2 text-xs text-[#8ea3cd]">No usage records yet this month.</p>
            ) : null}
            {summary.inventoryPulse.mostUsedItems.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-[#2f3d64] bg-[#0f182a] px-3 py-2 text-sm">
                <span className="text-white">{item.name}</span>
                <span className="text-xs text-[#8ea4cf]">{item.quantity} used</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="flex flex-wrap gap-2">
        <PremiumPillButton label="Quick Add Stock" href="/app/dashboard/budget-stock?open=inventory" tone="rose" />
        <PremiumPillButton label="Quick Restock" href="/app/dashboard/budget-stock?tab=stock&mode=LOW" tone="orange" />
      </div>

      <div className="inline-flex items-center gap-2 text-xs text-[#8ca3ce]">
        <Package className="h-3.5 w-3.5" />
        Operational stock and spending pulse from Budget/Stock data.
      </div>
    </GlowCard>
  );
}
