"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

import type { ProductionSettingsWorkspace as ProductionSettingsWorkspaceComponent } from "@/app/app/settings/_components/ProductionSettingsWorkspace";
import { GlassPanel } from "@/components/glass/GlassPanel";

type ProductionSettingsWorkspaceLazyProps = ComponentProps<typeof ProductionSettingsWorkspaceComponent>;

const ProductionSettingsWorkspaceClient = dynamic<ProductionSettingsWorkspaceLazyProps>(
  () => import("@/app/app/settings/_components/ProductionSettingsWorkspace").then((mod) => mod.ProductionSettingsWorkspace),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <GlassPanel variant="warm" className="h-36 animate-pulse" />
        <div className="grid gap-4 lg:grid-cols-[290px_minmax(0,1fr)]">
          <GlassPanel variant="warm" className="hidden h-[720px] animate-pulse lg:block" />
          <GlassPanel variant="warm" className="h-[720px] animate-pulse" />
        </div>
      </div>
    )
  }
);

export function ProductionSettingsWorkspaceLazy(props: ProductionSettingsWorkspaceLazyProps) {
  return <ProductionSettingsWorkspaceClient {...props} />;
}
