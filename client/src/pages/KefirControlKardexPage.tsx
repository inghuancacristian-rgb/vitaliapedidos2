import { ArrowLeft, FlaskConical } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ProductionKardexTab from "@/pages/ProductionKardexTab";

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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-500 text-white shadow-sm">
                <FlaskConical className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Kárdex de Producción</h1>
                <p className="text-sm text-slate-500">Subruta independiente dentro de KéfirControl</p>
              </div>
            </div>
          </div>

          <Link href="/kefir-control/index.html">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver al módulo
            </Button>
          </Link>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6">
        <ProductionKardexTab movements={movements} loadingMovements={loadingMovements} safeFormat={safeFormat} />
      </main>
    </div>
  );
}
