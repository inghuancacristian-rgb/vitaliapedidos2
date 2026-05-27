import { format } from "date-fns";
import { es } from "date-fns/locale";
import { trpc } from "@/lib/trpc";
import ProductionKardexTab from "@/pages/ProductionKardexTab";
import KefirControlLayout from "@/pages/KefirControlLayout";

export default function KefirControlKardexPage() {
  const { data: movements = [], isLoading: loadingMovements } =
    trpc.production.getKefirMovements.useQuery(undefined, { retry: 2, refetchOnWindowFocus: true });

  const safeFormat = (dateVal: any, fmt: string) => {
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return "—";
      return format(d, fmt, { locale: es });
    } catch {
      return "—";
    }
  };

  return (
    <KefirControlLayout
      title="Kárdex de Producción"
      subtitle="Subruta independiente dentro de KéfirControl"
    >
      <ProductionKardexTab movements={movements} loadingMovements={loadingMovements} safeFormat={safeFormat} />
    </KefirControlLayout>
  );
}
