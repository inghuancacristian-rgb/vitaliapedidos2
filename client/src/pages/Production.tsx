import { ExternalLink, FlaskConical, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

export function Production() {
  const [syncDone, setSyncDone] = useState(false);
  const { data: inventoryData, isLoading } = trpc.inventory.listInventory.useQuery();

  useEffect(() => {
    if (inventoryData) {
      const kefirInventory = inventoryData.map((item: any) => {
        let category = "materia";
        if (item.product?.category === "finished_product") category = "producto";
        else if (item.product?.category === "supplies" || item.product?.category === "insumo") category = "insumo";
        else if (item.product?.category === "raw_material") category = "materia";
        else if (item.product?.category === "envase") category = "envase"; // Just in case
        
        return {
          id: item.productId,
          name: item.product?.name || "Desconocido",
          quantity: item.quantity || 0,
          minStock: item.minStock || 0,
          unit: item.product?.unit || "unidad",
          presentationVolumeMl: item.product?.presentationVolumeMl || 1000,
          costPerUnit: (item.product?.price || 0) / 100,
          category
        };
      });
      localStorage.setItem("kefir_inventory_v3", JSON.stringify(kefirInventory));
      setSyncDone(true);
    }
  }, [inventoryData]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
      <div className="border-b bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Produccion Industrial</h1>
              <p className="text-sm text-slate-500">Modulo KefirControl integrado localmente</p>
            </div>
          </div>

          <a
            href="/kefir-control/index.html"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir en pantalla completa
          </a>
        </div>
      </div>

      {isLoading || !syncDone ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <span className="ml-2 text-slate-500">Sincronizando inventario...</span>
        </div>
      ) : (
        <iframe
          title="KefirControl"
          src="/kefir-control/index.html"
          className="h-[calc(100vh-8.5rem)] w-full border-0 bg-white md:h-[calc(100vh-7rem)]"
        />
      )}
    </div>
  );
}
