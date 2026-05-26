import { ExternalLink, FlaskConical, Loader2, ArrowRightLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function Production() {
  const [syncKey, setSyncKey] = useState(Date.now());
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [productionItems, setProductionItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const utils = trpc.useContext();
  const setStorageMutation = trpc.production.setKefirStorage.useMutation();
  const { data: kefirStorageData } = trpc.production.getKefirStorage.useQuery(undefined, {
    enabled: true,
    refetchOnWindowFocus: false,
  });
  const { data: movements } = trpc.production.getKefirMovements.useQuery();
  const transferMutation = trpc.inventory.transferToGeneral.useMutation({
    onSuccess: (data) => {
      // Restar del localStorage
      try {
        const kInvStr = localStorage.getItem('kefir_inventory_v3');
        let kInv: any[] = [];
        try {
          const parsed = JSON.parse(kInvStr || "[]");
          kInv = Array.isArray(parsed) ? parsed : Object.values(parsed);
        } catch(e) {
          kInv = [];
        }
        
        data.items.forEach((item: any) => {
          const nameLower = item.productName.toLowerCase();
          const existingItem = kInv.find((i: any) => i.name?.toLowerCase() === nameLower);
          if (existingItem) {
            existingItem.quantity = Math.max(0, (existingItem.quantity || existingItem.stock || 0) - item.quantity);
          }
        });
        
        const newVal = JSON.stringify(kInv);
        localStorage.setItem('kefir_inventory_v3', newVal);
        setStorageMutation.mutate({ key: 'kefir_inventory_v3', value: newVal });
        setSyncKey(Date.now()); // Recargar iframe para que vea los cambios
      } catch (e) {
        console.error("Error updating local storage", e);
      }

      toast.success(`Traspaso ${data.transferNumber} realizado con éxito`);
      setIsTransferOpen(false);
      setSelectedItems({});
      setNotes("");
      (utils as any).inventory?.listInventory?.invalidate?.();
      (utils as any).inventory?.getTransfers?.invalidate?.();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al realizar el traspaso");
    }
  });

  const openTransferDialog = () => {
    try {
      const kInvStr = localStorage.getItem('kefir_inventory_v3');
      let kInv: any[] = [];
      try {
        const parsed = JSON.parse(kInvStr || "[]");
        kInv = Array.isArray(parsed) ? parsed : Object.values(parsed);
      } catch(e) {
        kInv = [];
      }
      
      const items = kInv.filter((i: any) => 
        ((i.quantity || i.stock || 0) > 0) && 
        (i.category === "producto" || i.category === "finished_product" || String(i.id).startsWith("PROD-") || i.name?.toLowerCase().includes("kefir") || i.name?.toLowerCase().includes("queso") || i.name?.toLowerCase().includes("suero"))
      );
      
      setProductionItems(items);
      setSelectedItems({});
      setNotes("");
      setIsTransferOpen(true);
    } catch (e) {
      toast.error("No se pudo leer el inventario de producción");
    }
  };

  useEffect(() => {
    if (kefirStorageData) {
      if (kefirStorageData.length > 0) {
        kefirStorageData.forEach((row) => {
          localStorage.setItem(row.storage_key, row.storage_value);
        });
      } else {
        // Cloud is empty. Seed cloud from localStorage (for the first user syncing)
        ['kefir_inventory_v3', 'kefir_batches_v3', 'kefir_yields'].forEach(key => {
          const val = localStorage.getItem(key);
          if (val) {
            setStorageMutation.mutate({ key, value: val });
          }
        });
      }
      // Force iframe reload and mark as not loading
      setSyncKey(Date.now());
      setIsLoading(false);
      
      // FIX AUTOMÁTICO: Corregir items que se hayan categorizado erróneamente en el pasado
      try {
        const kInvStr = localStorage.getItem('kefir_inventory_v3');
        if (kInvStr) {
          let kInv = JSON.parse(kInvStr);
          const wasArray = Array.isArray(kInv);
          kInv = wasArray ? kInv : Object.values(kInv);
          let changed = !wasArray;
          kInv.forEach((v: any) => {
            if (v.category === "producto" && (v.name?.toLowerCase().includes("botella") || v.name?.toLowerCase().includes("tapa") || v.name?.toLowerCase().includes("envase") || v.name?.toLowerCase().includes("etiqueta"))) {
              v.category = "envase";
              changed = true;
            }
          });
          if (changed) {
            const newVal = JSON.stringify(kInv);
            localStorage.setItem('kefir_inventory_v3', newVal);
            setStorageMutation.mutate({ key: 'kefir_inventory_v3', value: newVal });
          }
        }
      } catch (e) {
        console.error("Error auto-fixing inventory", e);
      }
    }
  }, [kefirStorageData]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OPEN_TRANSFER_DIALOG') {
        openTransferDialog();
      }
    };
    
    // Sync localStorage changes back to server
    let timeoutId: any;
    const handleStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('kefir_') && e.newValue) {
        // Debounce to prevent spam
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setStorageMutation.mutate({ key: e.key!, value: e.newValue! });
        }, 500);
      }
    };
    
    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
      clearTimeout(timeoutId);
    };
  }, []);

  const handleQuantityChange = (id: string, val: string, maxQty: number) => {
    if (val === "") {
      setSelectedItems(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    
    const num = Number(val);
    if (!isNaN(num) && num > maxQty) {
      toast.error(`Cantidad máxima disponible: ${maxQty}`);
      val = maxQty.toString();
    }
    
    setSelectedItems(prev => ({
      ...prev,
      [id]: val
    }));
  };

  const handleSubmit = () => {
    const itemsToTransfer = Object.entries(selectedItems)
      .map(([id, qty]) => {
        const item = productionItems.find(i => i.id === id);
        return {
          productId: 0, // El backend lo buscará por nombre si es 0
          productName: item?.name || id,
          quantity: Number(qty)
        };
      })
      .filter(i => i.quantity > 0);

    if (itemsToTransfer.length === 0) {
      toast.error("Seleccione al menos un producto para traspasar");
      return;
    }

    transferMutation.mutate({
      items: itemsToTransfer,
      notes: notes.trim() || undefined
    });
  };

  const selectedCount = Object.keys(selectedItems).length;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
      <div className="border-b bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Producción Industrial</h1>
              <p className="text-sm text-slate-500">Módulo KefirControl (Aislado)</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>              <DialogContent className="max-w-3xl rounded-[2rem] border-white/70 bg-white/95">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">Traspaso a Inventario General</DialogTitle>
                  <p className="text-sm text-slate-500">Mueva los productos terminados al inventario principal para su comercialización.</p>
                </DialogHeader>
                
                <div className="max-h-[50vh] overflow-y-auto pr-2 mt-4 space-y-3">
                  {productionItems.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      No hay productos terminados con stock en el área de producción.
                    </div>
                  ) : (
                    productionItems.map(item => {
                      const isSelected = selectedItems[item.id] !== undefined;
                      return (
                        <div key={item.id} className={`p-4 rounded-xl border flex items-center justify-between ${isSelected ? 'border-blue-400 bg-blue-50/50' : 'border-slate-200 bg-white'}`}>
                          <div>
                            <p className="font-bold text-slate-900">{item.name}</p>
                            <Badge variant="outline" className="mt-1">Disp: {item.stock}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label>Traspasar:</Label>
                            <Input 
                              type="number" 
                              min="0" 
                              max={item.stock}
                              className="w-24 text-right font-bold"
                              value={selectedItems[item.id] || ""}
                              onChange={(e) => handleQuantityChange(item.id, e.target.value, item.stock)}
                            />
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <Label>Notas (Opcional)</Label>
                    <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: Lote terminado hoy" />
                  </div>
                  <Button 
                    className="w-full h-12 text-lg font-bold" 
                    onClick={handleSubmit}
                    disabled={selectedCount === 0 || transferMutation.isPending}
                  >
                    {transferMutation.isPending ? "Procesando..." : "Confirmar Traspaso"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

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

      <Tabs defaultValue="panel" className="w-full">
        <div className="border-b bg-white px-4">
          <TabsList className="bg-transparent mb-[-1px]">
            <TabsTrigger 
              value="panel" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none px-6 py-3 font-semibold"
            >
              Panel de Producción
            </TabsTrigger>
            <TabsTrigger 
              value="kardex" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none px-6 py-3 font-semibold"
            >
              Kárdex / Historial
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="panel" className="m-0 border-0 p-0">
          {isLoading ? (
            <div className="flex h-[calc(100vh-11rem)] w-full flex-col items-center justify-center bg-white">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
              <p className="text-slate-500 font-medium animate-pulse">Sincronizando estado desde la nube...</p>
            </div>
          ) : (
            <iframe
              key={syncKey}
              title="KefirControl"
              src="/kefir-control/index.html"
              className="h-[calc(100vh-11rem)] w-full border-0 bg-white"
            />
          )}
        </TabsContent>

        <TabsContent value="kardex" className="m-0 border-0 p-6 bg-slate-50 min-h-[calc(100vh-11rem)]">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-w-6xl mx-auto">
            <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Historial de Movimientos de Producción</h2>
                <p className="text-sm text-slate-500">Kárdex generado automáticamente a partir de los cambios detectados en la nube.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => utils.production.getKefirMovements.invalidate()}>
                Actualizar
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="text-right">Movimiento</TableHead>
                    <TableHead className="text-right">Saldo Final</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!movements || movements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                        No hay movimientos registrados. Realice cambios en el Panel de Producción para generar historial.
                      </TableCell>
                    </TableRow>
                  ) : (
                    movements.map((mov) => (
                      <TableRow key={mov.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {format(new Date(mov.createdAt), "dd MMM yyyy, HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-700">{mov.productName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{mov.category || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell className="text-slate-600">{mov.reason}</TableCell>
                        <TableCell className="text-right">
                          <span className={\`font-bold \${mov.changeAmount > 0 ? 'text-green-600' : 'text-red-600'}\`}>
                            {mov.changeAmount > 0 ? '+' : ''}{mov.changeAmount}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-black text-slate-900 text-lg">
                          {mov.newQuantity}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
