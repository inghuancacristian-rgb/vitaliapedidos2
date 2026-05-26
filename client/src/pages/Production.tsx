import { ExternalLink, FlaskConical, Loader2, ArrowRightLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export function Production() {
  const [syncKey, setSyncKey] = useState(Date.now());
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [productionItems, setProductionItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");

  const utils = trpc.useContext();
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
        
        localStorage.setItem('kefir_inventory_v3', JSON.stringify(kInv));
        window.dispatchEvent(new Event('storage'));
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
          localStorage.setItem('kefir_inventory_v3', JSON.stringify(kInv));
          window.dispatchEvent(new Event('storage'));
        }
      }
    } catch (e) {
      console.error("Error auto-fixing inventory", e);
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OPEN_TRANSFER_DIALOG') {
        openTransferDialog();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
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

      <iframe
        key={syncKey}
        title="KefirControl"
        src="/kefir-control/index.html"
        className="h-[calc(100vh-8.5rem)] w-full border-0 bg-white md:h-[calc(100vh-7rem)]"
      />
    </div>
  );
}
