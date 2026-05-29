import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  PRODUCTION_QUERY_OPTIONS,
  getInventoryWithStock,
} from "@/lib/production";
import ProductionInventoryTab from "@/pages/kefir-control/inventario-produccion/ProductionInventoryTab";
import KefirControlLayout from "@/pages/kefir-control/_shared/KefirControlLayout";

export default function KefirControlInventoryPage() {
  const { data: productionInventory = [], isLoading: loadingInv } =
    trpc.production.getProductionInventory.useQuery(
      undefined,
      PRODUCTION_QUERY_OPTIONS
    );

  const inventoryWithStock = useMemo(
    () => getInventoryWithStock(productionInventory),
    [productionInventory]
  );

  return (
    <KefirControlLayout
      title="Inventario de Producción"
      subtitle="Subruta independiente dentro de KéfirControl"
    >
      <ProductionInventoryTab
        inventoryWithStock={productionInventory || []}
        loadingInv={loadingInv}
      />
    </KefirControlLayout>
  );
}
