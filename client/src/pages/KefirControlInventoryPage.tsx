import { trpc } from "@/lib/trpc";
import ProductionInventoryTab from "@/pages/ProductionInventoryTab";
import KefirControlLayout from "@/pages/KefirControlLayout";

export default function KefirControlInventoryPage() {
  const { data: productionInventory = [], isLoading: loadingInv } =
    trpc.production.getProductionInventory.useQuery(undefined, { retry: 2, refetchOnWindowFocus: true });

  const inventoryWithStock = productionInventory.filter((item: any) => Number(item.quantity) > 0);

  return (
    <KefirControlLayout
      title="Inventario de Producción"
      subtitle="Subruta independiente dentro de KéfirControl"
    >
      <ProductionInventoryTab inventoryWithStock={inventoryWithStock} loadingInv={loadingInv} />
    </KefirControlLayout>
  );
}
