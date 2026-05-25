import { ExternalLink, FlaskConical, Loader2, CheckCircle2 } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function Production() {
  const [syncDone, setSyncDone] = useState(false);
  const [syncKey, setSyncKey] = useState(Date.now());
  const { data: inventoryData, isLoading, refetch } = trpc.inventory.listInventory.useQuery(undefined, {
    refetchInterval: 10000 // Sincroniza desde el DB cada 10 segundos
  });
  const updateQuantityMutation = trpc.inventory.updateQuantity.useMutation();
  const prevInventoryRef = useRef<any>(null);
  const isSyncingRef = useRef(false);

  const checkAndSyncKefir = useCallback(async () => {
    if (isSyncingRef.current || !prevInventoryRef.current) return false;
    
    const kStr = localStorage.getItem("kefir_inventory_v3");
    if (!kStr) return false;
    
    try {
      const kInv = JSON.parse(kStr);
      const updates: {id: number, diff: number, name: string}[] = [];
      
      for (const kItem of kInv) {
        const prevDbItem = prevInventoryRef.current.find((db: any) => db.productId === kItem.id);
        if (prevDbItem && prevDbItem.quantity !== kItem.quantity) {
          const diff = kItem.quantity - prevDbItem.quantity;
          updates.push({ id: kItem.id, diff, name: kItem.name });
        }
      }

      if (updates.length > 0) {
        isSyncingRef.current = true;
        let syncPromises = updates.map(u => 
          updateQuantityMutation.mutateAsync({
            productId: u.id,
            quantity: u.diff,
            reason: u.diff > 0 ? "Producción terminada en KefirControl" : "Consumo de insumos en KefirControl",
            type: u.diff > 0 ? "entry" : "exit"
          })
        );
        await Promise.all(syncPromises);
        
        toast.success(`Sincronización automática: se registraron ${updates.length} movimientos de producción en el inventario.`);
        await refetch();
        isSyncingRef.current = false;
        return true;
      }
    } catch(e) {
       console.error("Error sincronizando", e);
       isSyncingRef.current = false;
    }
    return false;
  }, [updateQuantityMutation, refetch]);

  useEffect(() => {
    if (!inventoryData) return;

    const updateLocalStorage = () => {
      const kefirInventory = inventoryData.map((item: any) => {
        const nameLower = (item.product?.name || "").toLowerCase();
        const role = item.product?.productionRole;
        const dbCategory = item.product?.category;

        let category = "insumo";

        if (role === "bottle" || dbCategory === "envase" || nameLower.includes("botella") || nameLower.includes("envase")) {
          category = "envase";
        } else if (role === "milk" || dbCategory === "raw_material" || nameLower.includes("leche")) {
          category = "materia";
        } else if (dbCategory === "finished_product" || role === "finished_good") {
          category = "producto";
        } else {
          category = "insumo";
        }
        
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
      prevInventoryRef.current = inventoryData;
      setSyncDone(true);
    };

    // Antes de sobreescribir localStorage, verificamos si hay cambios locales de producción pendientes
    checkAndSyncKefir().then((didSync) => {
      if (!didSync) {
        updateLocalStorage();
      }
    });

  }, [inventoryData, checkAndSyncKefir]);

  // Polling rápido para detectar producción local en el iframe casi instantáneamente
  useEffect(() => {
    const interval = setInterval(() => {
      checkAndSyncKefir();
    }, 2000);
    return () => clearInterval(interval);
  }, [checkAndSyncKefir]);

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
              <p className="text-sm text-slate-500 flex items-center gap-1">
                Modulo KefirControl 
                <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                  <CheckCircle2 className="h-3 w-3" /> Sincronización Automática Activa
                </span>
              </p>
            </div>
          </div>

          <div className="flex gap-2">
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
      </div>

      {isLoading || !syncDone ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <span className="ml-2 text-slate-500">Iniciando sistema de producción...</span>
        </div>
      ) : (
        <iframe
          key={syncKey}
          title="KefirControl"
          src="/kefir-control/index.html"
          className="h-[calc(100vh-8.5rem)] w-full border-0 bg-white md:h-[calc(100vh-7rem)]"
        />
      )}
    </div>
  );
}
