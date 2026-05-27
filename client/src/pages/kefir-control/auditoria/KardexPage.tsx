import { trpc } from "@/lib/trpc";
import {
  PRODUCTION_QUERY_OPTIONS,
  formatProductionDate,
} from "@/lib/production";
import ProductionKardexTab from "@/pages/kefir-control/auditoria/ProductionKardexTab";
import KefirControlLayout from "@/pages/kefir-control/_shared/KefirControlLayout";

export default function KefirControlKardexPage() {
  const { data: movements = [], isLoading: loadingMovements } =
    trpc.production.getKefirMovements.useQuery(
      undefined,
      PRODUCTION_QUERY_OPTIONS
    );

  return (
    <KefirControlLayout
      title="Kárdex de Producción"
      subtitle="Subruta independiente dentro de KéfirControl"
    >
      <ProductionKardexTab
        movements={movements}
        loadingMovements={loadingMovements}
        safeFormat={formatProductionDate}
      />
    </KefirControlLayout>
  );
}
