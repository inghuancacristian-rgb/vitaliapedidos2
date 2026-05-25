import { ExternalLink, FlaskConical, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function Production() {
  const [syncDone, setSyncDone] = useState(false);
  const [syncKey, setSyncKey] = useState(Date.now());
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const { data: inventoryData, isLoading, refetch } = trpc.inventory.listInventory.useQuery(undefined, {
    refetchInterval: 10000 // Sincroniza desde el DB cada 10 segundos
  });
  const updateQuantityMutation = trpc.inventory.updateQuantity.useMutation();
  const logKefirDataMutation = trpc.production.logKefirData.useMutation();
  const prevInventoryRef = useRef<any>(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    // Debug: send localStorage data to backend for inspection
    const bStr = localStorage.getItem("kefir_batches_v3");
    const yStr = localStorage.getItem("kefir_yield_records_v3");
    const iStr = localStorage.getItem("kefir_inventory_v3");
    logKefirDataMutation.mutate({
      batches: bStr ? JSON.parse(bStr) : null,
      yields: yStr ? JSON.parse(yStr) : null,
      inventory: iStr ? JSON.parse(iStr) : null
    });
  }, []);

  const checkAndSyncKefir = useCallback(async (isManual = false) => {
    if (isSyncingRef.current || !prevInventoryRef.current) return false;
    
    const kStr = localStorage.getItem("kefir_inventory_v3");
    if (!kStr) return false;
    
    try {
      const kInv = JSON.parse(kStr);
      const updates: {id: number, diff: number, name: string}[] = [];
      
      for (const kItem of kInv) {
        // Map the iframe's item to the database's item
        let prevDbItem = prevInventoryRef.current.find((db: any) => db.productId === kItem.id);
        
        // If not found directly by ID (because of iframe hardcoded IDs or custom new IDs), map by role or name
        if (!prevDbItem) {
          prevDbItem = prevInventoryRef.current.find((db: any) => {
            if (!db.product) return false;
            
            const nameLower = (db.product.name || "").toLowerCase().trim();
            const kNameLower = (kItem.name || "").toLowerCase().trim();
            
            // Exact or clean name match
            if (nameLower === kNameLower || nameLower.replace(/k[eé]fir/g, "kefir") === kNameLower.replace(/k[eé]fir/g, "kefir")) return true;
            
            // Special mappings for finished products
            if (kItem.category === "producto" || kItem.category === "finished_product" || role === "finished_good" || db.product.category === "finished_product") {
              if (kNameLower.includes("natural") && (kNameLower.includes("1l") || kNameLower.includes("1000")) && 
                  nameLower.includes("natural") && (nameLower.includes("1 litro") || nameLower.includes("1l"))) return true;
            }
            
            // Map by productionRole for packaging supplies
            const role = db.product.productionRole;
            if (kItem.category === "envase") {
              if (role === "cap" && kItem.name.toLowerCase().includes("tapa")) return true;
              if (role === "label" && kItem.name.toLowerCase().includes("etiqueta")) return true;
              if (role === "bottle") {
                if (kItem.name.toLowerCase().includes("500") && nameLower.includes("500")) return true;
                if ((kItem.name.toLowerCase().includes("labneh") || kItem.name.toLowerCase().includes("250")) && (nameLower.includes("labneh") || nameLower.includes("250"))) return true;
                if ((kItem.name.toLowerCase().includes("1l") || kItem.name.toLowerCase().includes("1 l") || kItem.name.toLowerCase().includes("1000")) && (nameLower.includes("1l") || nameLower.includes("1 l") || nameLower.includes("1000"))) return true;
                if (kItem.name.toLowerCase().includes("750") && nameLower.includes("750")) return true;
              }
            }
            
            // Map by productionRole for raw materials (milk, sugar)
            if (kItem.category === "materia") {
              if (role === "milk" || nameLower.includes("leche")) {
                if (kItem.name.toLowerCase().includes("entera") && nameLower.includes("entera")) return true;
                if (kItem.name.toLowerCase().includes("descremada") && nameLower.includes("descremada")) return true;
                // Fallback for general milk if specifics don't match but both say milk
                if (kItem.name.toLowerCase().includes("leche") && nameLower.includes("leche")) return true;
              }
              if (role === "sugar" || nameLower.includes("azucar") || nameLower.includes("azúcar")) {
                if (kItem.name.toLowerCase().includes("morena") && nameLower.includes("morena")) return true;
                if (kItem.name.toLowerCase().includes("blanca") && nameLower.includes("blanca")) return true;
              }
            }
            return false;
          });
        }

        if (prevDbItem && prevDbItem.quantity !== kItem.quantity) {
          const diff = kItem.quantity - prevDbItem.quantity;
          updates.push({ id: prevDbItem.productId, diff, name: prevDbItem.product?.name || kItem.name });
        }
      }

      if (updates.length > 0) {
        isSyncingRef.current = true;
        console.log("[KefirSync] Updates to apply:", JSON.stringify(updates));
        let successCount = 0;
        let errors: string[] = [];
        
        for (const u of updates) {
          try {
            console.log(`[KefirSync] Updating productId=${u.id} diff=${u.diff} name=${u.name}`);
            await updateQuantityMutation.mutateAsync({
              productId: u.id,
              quantity: u.diff,  // Server does existingInv.quantity + input.quantity directly
              reason: u.diff > 0 ? "Producción terminada en KefirControl" : "Consumo de insumos en KefirControl",
              type: u.diff > 0 ? "entry" : "exit"
            });
            successCount++;
          } catch (err: any) {
            console.error(`[KefirSync] Error updating ${u.name} (id=${u.id}):`, err);
            errors.push(`${u.name}: ${err?.message || String(err)}`);
          }
        }
        
        if (successCount > 0) {
          toast.success(`Sincronización: se registraron ${successCount} movimientos de producción en el inventario.`);
        }
        if (errors.length > 0) {
          toast.error(`Error en ${errors.length} items: ${errors.join('; ')}`);
        }
        await refetch();
        isSyncingRef.current = false;
        return successCount > 0;
      } else if (isManual) {
        toast.info("El inventario ya se encuentra completamente sincronizado.");
      }
    } catch(e: any) {
       console.error("[KefirSync] Fatal error:", e);
       isSyncingRef.current = false;
       if (isManual) {
         toast.error(`Error al sincronizar: ${e?.message || String(e)}`);
       }
    }
    return false;
  }, [updateQuantityMutation, refetch]);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    await refetch();
    await checkAndSyncKefir(true);
    setIsManualSyncing(false);
  };

  useEffect(() => {
    if (!inventoryData) return;

    const updateLocalStorage = () => {
      const kefirInventory = inventoryData.map((item: any) => {
        const nameLower = (item.product?.name || "").toLowerCase();
        const role = item.product?.productionRole;
        const dbCategory = item.product?.category;

        let category = "insumo";

        if (dbCategory === "finished_product" || dbCategory === "producto" || role === "finished_good" || nameLower.includes("kefir") || nameLower.includes("kéfir") || nameLower.includes("queso") || nameLower.includes("labneh") || nameLower.includes("suero")) {
          category = "producto";
        } else if (role === "bottle" || dbCategory === "envase" || nameLower.includes("botella") || nameLower.includes("envase")) {
          category = "envase";
        } else if (role === "milk" || dbCategory === "raw_material" || nameLower.includes("leche") || nameLower.includes("azucar") || nameLower.includes("azúcar")) {
          category = "materia";
        } else {
          category = "insumo";
        }
        
        // Map database product to iframe's expected hardcoded ID
        let id: string | number = item.productId;
        
        if (category === "producto") {
          if (nameLower.includes("leche") && nameLower.includes("natural") && nameLower.includes("500")) id = "PROD-001";
          else if (nameLower.includes("leche") && nameLower.includes("frutilla") && nameLower.includes("500")) id = "PROD-002";
          else if (nameLower.includes("leche") && nameLower.includes("coco") && nameLower.includes("500")) id = "PROD-003";
          else if (nameLower.includes("leche") && nameLower.includes("natural") && (nameLower.includes("1l") || nameLower.includes("1000") || nameLower.includes("1 litro"))) id = "PROD-004";
          else if (nameLower.includes("leche") && nameLower.includes("frutilla") && nameLower.includes("750")) id = "PROD-005";
          else if (nameLower.includes("agua") && nameLower.includes("natural") && nameLower.includes("500")) id = "PROD-006";
          else if (nameLower.includes("agua") && (nameLower.includes("limón") || nameLower.includes("limon")) && nameLower.includes("500")) id = "PROD-007";
          else if (nameLower.includes("agua") && nameLower.includes("jengibre") && nameLower.includes("500")) id = "PROD-008";
          else if ((nameLower.includes("queso") || nameLower.includes("labneh")) && nameLower.includes("250")) id = "PROD-009";
          else if (nameLower.includes("suero") && nameLower.includes("500")) id = "PROD-010";
        } else if (role === "bottle" || category === "envase") {
          if (nameLower.includes("500")) id = 4;
          else if (nameLower.includes("labneh") || nameLower.includes("250")) id = 5;
          else if (nameLower.includes("1l") || nameLower.includes("1 l") || nameLower.includes("1000") || nameLower.includes("1 litro")) id = 11;
          else if (nameLower.includes("750")) id = 12;
        } else if (role === "cap" || nameLower.includes("tapa")) {
          id = 6;
        } else if (role === "label" || nameLower.includes("etiqueta")) {
          id = 7;
        }
        
        return {
          id,
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
            <button
              onClick={handleManualSync}
              disabled={isManualSyncing}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isManualSyncing ? 'animate-spin' : ''}`} />
              Sincronizar Ahora
            </button>
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
