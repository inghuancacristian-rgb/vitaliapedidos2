import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowRightLeft, Package, Search, Check, Minus, Plus, X, ChevronRight } from "lucide-react";

export function TransferToProductionDialog({ 
  inventoryItems, 
  onSuccess 
}: { 
  inventoryItems: any[],
  onSuccess?: () => void
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState("");
  
  const utils = trpc.useContext();
  const transferMutation = trpc.inventory.transferToProduction.useMutation({
    onSuccess: (data) => {
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
          let existingItem = kInv.find((i: any) => i.name?.toLowerCase() === nameLower);
          
          let kCategory = "materia";
          if (item.category === "supplies") kCategory = "envase";
          else if (item.category === "finished_product") kCategory = "producto";
          else if (item.category === "insumo" && (nameLower.includes("botella") || nameLower.includes("tapa") || nameLower.includes("envase") || nameLower.includes("etiqueta"))) {
            kCategory = "envase";
          }
          
          if (!existingItem) {
            const nextId = kInv.length > 0 ? Math.max(...kInv.map((i:any) => typeof i.id === 'number' ? i.id : 0)) + 1 : 1;

            existingItem = { 
              id: nextId, 
              name: item.productName, 
              quantity: 0, 
              unit: item.unit || 'uds', 
              minStock: 0,
              category: kCategory
            };
            kInv.push(existingItem);
          } else {
            existingItem.category = kCategory; // Ensure it corrects any old manual entries
          }
          
          // KefirControl uses "quantity" instead of "stock"
          existingItem.quantity = (existingItem.quantity || existingItem.stock || 0) + item.quantity;
          if (existingItem.stock !== undefined) delete existingItem.stock;
        });

        // FIX PARA TRASPASOS ANTERIORES
        kInv.forEach((v: any) => {
          if (!v.category || v.category === "insumo") {
            if (v.name?.toLowerCase().includes("botella") || v.name?.toLowerCase().includes("tapa") || v.name?.toLowerCase().includes("envase") || v.name?.toLowerCase().includes("etiqueta")) {
              v.category = "envase";
            } else {
              v.category = "materia";
            }
          }
          if (v.stock !== undefined) {
             v.quantity = (v.quantity || 0) + v.stock;
             delete v.stock;
          }
          if (typeof v.id === 'string') {
             v.id = Math.max(1, ...kInv.map((i:any) => typeof i.id === 'number' ? i.id : 0)) + 1;
          }
        });
        
        localStorage.setItem('kefir_inventory_v3', JSON.stringify(kInv));
        window.dispatchEvent(new Event('storage'));
      } catch (e) {
        console.error("No se pudo actualizar KefirControl localStorage", e);
      }

      toast.success("Traspaso " + data.transferNumber + " realizado con éxito");
      setIsOpen(false);
      setSelectedItems({});
      setNotes("");
      setSearchTerm("");
      if (onSuccess) onSuccess();
      (utils as any).inventory?.listInventory?.invalidate?.();
      (utils as any).inventory?.getTransfers?.invalidate?.();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al realizar el traspaso");
    }
  });

  // Solo mostrar materias primas, insumos y supplies que tengan stock > 0
  const eligibleItems = useMemo(() => {
    return inventoryItems.filter(item => 
      item.quantity > 0 && 
      item.product && 
      (item.product.category === "raw_material" || item.product.category === "supplies" || item.product.category === "insumo")
    );
  }, [inventoryItems]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return eligibleItems;
    const lowerSearch = searchTerm.toLowerCase();
    return eligibleItems.filter(item => 
      item.product?.name?.toLowerCase().includes(lowerSearch) ||
      item.product?.code?.toLowerCase().includes(lowerSearch)
    );
  }, [eligibleItems, searchTerm]);

  const toggleItem = (productId: number, maxQty: number) => {
    setSelectedItems(prev => {
      if (prev[productId] !== undefined) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: maxQty };
    });
  };

  const updateQty = (productId: number, value: number, maxQty: number) => {
    const clamped = Math.max(0, Math.min(value, maxQty));
    if (clamped === 0) {
      setSelectedItems(prev => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    } else {
      setSelectedItems(prev => ({ ...prev, [productId]: clamped }));
    }
  };

  const handleSelectAll = () => {
    const next: Record<number, number> = {};
    filteredItems.forEach(item => {
      next[item.productId] = item.quantity;
    });
    setSelectedItems(next);
  };

  const handleClearSelection = () => {
    setSelectedItems({});
  };

  const handleSubmit = () => {
    const itemsToTransfer = Object.entries(selectedItems)
      .map(([id, qty]) => ({
        productId: Number(id),
        quantity: qty
      }))
      .filter(i => i.quantity > 0);

    if (itemsToTransfer.length === 0) {
      toast.error("Seleccione al menos un item para traspasar");
      return;
    }

    transferMutation.mutate({
      items: itemsToTransfer,
      notes: notes.trim() || undefined
    });
  };

  const selectedCount = Object.keys(selectedItems).length;
  const totalUnits = Object.values(selectedItems).reduce((s, q) => s + q, 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl">
          <ArrowRightLeft className="h-4 w-4" />
          Traspaso a Producción
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border-slate-200 bg-white p-0 overflow-hidden gap-0">
        
        {/* Header */}
        <div className="p-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-900">Traspaso a Producción</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-slate-500">Seleccione insumos y cantidades</p>
            </div>
          </div>

          {/* Search + Actions */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar por nombre o código..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 rounded-xl border-slate-200 bg-slate-50 focus:bg-white transition-colors"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleSelectAll} className="rounded-xl text-xs font-semibold h-10 px-3 whitespace-nowrap border-slate-200">
              Sel. Todo
            </Button>
            {selectedCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearSelection} className="rounded-xl text-xs font-semibold h-10 px-3 text-red-500 hover:bg-red-50 hover:text-red-600 whitespace-nowrap">
                Limpiar
              </Button>
            )}
          </div>
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto min-h-0" style={{ maxHeight: "400px" }}>
          {filteredItems.length === 0 ? (
            <div className="text-center py-16 px-6">
              <Package className="h-12 w-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-semibold">No hay insumos disponibles</p>
              <p className="text-sm text-slate-400 mt-1">Solo se muestran materias primas e insumos con stock &gt; 0</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredItems.map(item => {
                const isSelected = selectedItems[item.productId] !== undefined;
                const qty = selectedItems[item.productId] ?? 0;
                const maxQty = item.quantity;
                const unitLabel = item.product?.unit || 'ud';

                return (
                  <div 
                    key={item.id} 
                    className={"flex items-center gap-3 px-5 py-3 transition-colors " + (isSelected ? "bg-blue-50/60" : "hover:bg-slate-50")}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleItem(item.productId, maxQty)}
                      className={"flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all " + (isSelected ? "bg-blue-500 border-blue-500 text-white" : "border-slate-300 hover:border-blue-400")}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </button>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <p className={"text-sm font-semibold truncate " + (isSelected ? "text-blue-900" : "text-slate-800")}>
                        {item.product?.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.product?.code && (
                          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{item.product.code}</span>
                        )}
                        <span className={"text-xs font-medium px-1.5 py-0.5 rounded " + (isSelected ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500")}>
                          Stock: {maxQty} {unitLabel}
                        </span>
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => updateQty(item.productId, qty - 1, maxQty)}
                        disabled={qty <= 0}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-100 flex items-center justify-center transition-colors"
                      >
                        <Minus className="h-3.5 w-3.5 text-slate-600" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={maxQty}
                        value={qty || ""}
                        placeholder="0"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            setSelectedItems(prev => {
                              const next = { ...prev };
                              delete next[item.productId];
                              return next;
                            });
                          } else {
                            updateQty(item.productId, Number(val), maxQty);
                          }
                        }}
                        className={"w-16 h-8 text-center text-sm font-bold border rounded-lg outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none " + (isSelected ? "border-blue-300 bg-white text-blue-700 focus:ring-2 focus:ring-blue-200" : "border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-slate-200")}
                      />
                      <button
                        onClick={() => updateQty(item.productId, qty + 1, maxQty)}
                        disabled={qty >= maxQty}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-100 flex items-center justify-center transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5 text-slate-600" />
                      </button>
                      <button
                        onClick={() => updateQty(item.productId, maxQty, maxQty)}
                        className={"text-[10px] font-bold px-1.5 py-1 rounded-md transition-colors " + (qty === maxQty ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600")}
                        title="Traspasar todo"
                      >
                        MAX
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50/80 p-4 space-y-3">
          {/* Notes */}
          <div>
            <Label htmlFor="transfer-notes" className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
              Notas (opcional)
            </Label>
            <Input 
              id="transfer-notes"
              placeholder="Ej: Traspaso para producción del día..." 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 rounded-xl border-slate-200 bg-white text-sm"
            />
          </div>
          
          {/* Summary + Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
                <span className="text-xs text-slate-500">Items:</span>
                <span className="text-sm font-bold text-slate-900">{selectedCount}</span>
              </div>
              {totalUnits > 0 && (
                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg">
                  <span className="text-xs text-blue-600">Total:</span>
                  <span className="text-sm font-bold text-blue-700">{totalUnits} uds</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="rounded-xl font-semibold text-slate-600" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button 
                size="sm"
                onClick={handleSubmit} 
                disabled={selectedCount === 0 || transferMutation.isPending}
                className="rounded-xl font-bold px-5 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 gap-1.5 disabled:opacity-40"
              >
                {transferMutation.isPending ? "Procesando..." : (
                  <>
                    Confirmar
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
