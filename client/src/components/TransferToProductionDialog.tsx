import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowRightLeft, Package, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function TransferToProductionDialog({ 
  inventoryItems, 
  onSuccess 
}: { 
  inventoryItems: any[],
  onSuccess?: () => void
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState("");
  
  const utils = trpc.useContext();
  const transferMutation = trpc.inventory.transferToProduction.useMutation({
    onSuccess: (data) => {
      // 1. Escribir al localStorage de KefirControl (compartido en el mismo dominio)
      try {
        const kInvStr = localStorage.getItem('kefir_inventory_v3');
        const kInv = kInvStr ? JSON.parse(kInvStr) : {};
        
        data.items.forEach((item: any) => {
          const nameLower = item.productName.toLowerCase();
          if (!kInv[nameLower]) {
            kInv[nameLower] = { id: nameLower, name: item.productName, stock: 0, unit: item.unit || 'uds', minStock: 0 };
          }
          kInv[nameLower].stock = (kInv[nameLower].stock || 0) + item.quantity;
        });
        
        localStorage.setItem('kefir_inventory_v3', JSON.stringify(kInv));
        // Despachar evento para que KefirControl lo sepa si está abierto
        window.dispatchEvent(new Event('storage'));
      } catch (e) {
        console.error("No se pudo actualizar KefirControl localStorage", e);
      }

      toast.success(`Traspaso ${data.transferNumber} realizado con éxito`);
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

  const handleQuantityChange = (productId: number, val: string, maxQty: number) => {
    // Si el string esta vacío, actualizamos igual para dejar borrar
    if (val === "") {
      setSelectedItems(prev => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      return;
    }
    
    // Validar maximo
    const num = Number(val);
    if (!isNaN(num) && num > maxQty) {
      toast.error(`Cantidad máxima disponible: ${maxQty}`);
      val = maxQty.toString();
    }
    
    setSelectedItems(prev => ({
      ...prev,
      [productId]: val
    }));
  };

  const handleSelectAll = () => {
    const next: Record<number, string> = {};
    filteredItems.forEach(item => {
      next[item.productId] = item.quantity.toString();
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
        quantity: Number(qty)
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl">
          <ArrowRightLeft className="h-4 w-4" />
          Traspaso a Producción
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col rounded-[2rem] border-white/70 bg-white/95 p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-2xl text-blue-700">
              <ArrowRightLeft className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black text-slate-900">Traspaso Múltiple a Producción</DialogTitle>
              <p className="text-sm text-slate-500 font-medium">Seleccione los insumos a enviar al área de producción</p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-2 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50 border-y border-slate-100">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar insumo..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl border-slate-200 bg-white"
            />
          </div>
          <div className="flex gap-2">
             <Button variant="outline" size="sm" onClick={handleSelectAll} className="rounded-lg text-xs font-bold">
               Seleccionar Todo (vista actual)
             </Button>
             <Button variant="ghost" size="sm" onClick={handleClearSelection} className="rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700">
               Limpiar
             </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {filteredItems.length === 0 ? (
             <div className="text-center py-12">
               <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
               <p className="text-slate-500 font-bold">No hay insumos disponibles para traspasar.</p>
               <p className="text-sm text-slate-400">Solo se muestran materias primas e insumos con stock &gt; 0.</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map(item => {
                const isSelected = selectedItems[item.productId] !== undefined;
                return (
                  <div 
                    key={item.id} 
                    className={`p-4 rounded-2xl border transition-all duration-200 ${isSelected ? 'border-blue-500 bg-blue-50/30 shadow-[0_4px_20px_rgba(59,130,246,0.1)]' : 'border-slate-200 bg-white hover:border-blue-200'}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                       <div>
                         <h4 className="font-bold text-slate-900 leading-tight">{item.product?.name}</h4>
                         <p className="text-[10px] text-slate-500 font-bold tracking-wider uppercase mt-0.5">{item.product?.code}</p>
                       </div>
                       <Badge variant="outline" className={`rounded-md ${isSelected ? 'border-blue-200 bg-blue-100 text-blue-700' : 'bg-slate-50'}`}>
                         Disp: {item.quantity}
                       </Badge>
                    </div>
                    
                    <div className="flex items-center gap-3">
                       <Label className="text-xs font-bold text-slate-600">Traspasar:</Label>
                       <div className="relative flex-1">
                         <Input 
                           type="number" 
                           min="0" 
                           max={item.quantity}
                           step="any"
                           placeholder="0"
                           value={selectedItems[item.productId] || ""}
                           onChange={(e) => handleQuantityChange(item.productId, e.target.value, item.quantity)}
                           className={`h-10 rounded-xl text-right pr-12 font-bold ${isSelected ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'}`}
                         />
                         <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase">
                           {item.product?.unit || 'ud'}
                         </span>
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 bg-white border-t border-slate-100 space-y-4">
           <div>
             <Label htmlFor="notes" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Notas del Traspaso (Opcional)</Label>
             <Input 
               id="notes"
               placeholder="Ej: Traspaso para produccion del dia..." 
               value={notes}
               onChange={(e) => setNotes(e.target.value)}
               className="h-11 rounded-xl mt-1 border-slate-200"
             />
           </div>
           
           <div className="flex items-center justify-between pt-2">
             <div className="flex items-center gap-2">
               <div className="bg-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-2">
                 <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Items seleccionados:</span>
                 <span className="text-lg font-black text-slate-900">{selectedCount}</span>
               </div>
             </div>
             
             <div className="flex gap-3">
               <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setIsOpen(false)}>Cancelar</Button>
               <Button 
                 onClick={handleSubmit} 
                 disabled={selectedCount === 0 || transferMutation.isPending}
                 className="rounded-xl font-bold px-8 shadow-md"
               >
                 {transferMutation.isPending ? "Procesando..." : "Confirmar Traspaso"}
               </Button>
             </div>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
