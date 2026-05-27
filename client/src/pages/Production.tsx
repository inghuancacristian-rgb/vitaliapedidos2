import { FlaskConical, Loader2, ArrowRightLeft, Plus, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
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
import ProductionInventoryTab from "@/pages/ProductionInventoryTab";

export function Production() {
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isNewBatchOpen, setIsNewBatchOpen] = useState(false);
  const [isCompleteBatchOpen, setIsCompleteBatchOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);

  // Transfer State
  const [transferItems, setTransferItems] = useState<Record<number, string>>({});
  const [transferNotes, setTransferNotes] = useState("");

  // New Batch State
  const [batchType, setBatchType] = useState<'kefir_production' | 'nodule_washing' | 'maintenance'>('kefir_production');
  const [batchNotes, setBatchNotes] = useState("");

  // Complete Batch State
  const [outputs, setOutputs] = useState<{ productId: number; quantity: string }[]>([]);
  const [inputs, setInputs] = useState<{ productId: number; quantity: string }[]>([]);

  const utils = trpc.useContext();

  // ── Queries ────────────────────────────────────────────────
  const { data: batches, isLoading: loadingBatches, error: batchesError } =
    trpc.production.getBatches.useQuery(undefined, { retry: 2, refetchOnWindowFocus: true });

  const { data: productionInventory, isLoading: loadingInv, error: invError } =
    trpc.production.getProductionInventory.useQuery(undefined, { retry: 2, refetchOnWindowFocus: true });

  const { data: movements, isLoading: loadingMovements } =
    trpc.production.getKefirMovements.useQuery(undefined, { retry: 2, refetchOnWindowFocus: true });

  // CORRECTED: listProducts (not getProducts)
  const { data: allProducts } =
    trpc.inventory.listProducts.useQuery(undefined, { retry: 2 });

  // ── Mutations ──────────────────────────────────────────────
  const createBatchMutation = trpc.production.createBatch.useMutation({
    onSuccess: () => {
      toast.success("Lote iniciado exitosamente");
      setIsNewBatchOpen(false);
      setBatchNotes("");
      utils.production.getBatches.invalidate();
    },
    onError: (err) => toast.error("Error al iniciar lote: " + err.message),
  });

  const completeBatchMutation = trpc.production.completeBatch.useMutation({
    onSuccess: () => {
      toast.success("Lote finalizado. El stock de Planta se actualizó.");
      setIsCompleteBatchOpen(false);
      setSelectedBatchId(null);
      utils.production.getBatches.invalidate();
      utils.production.getProductionInventory.invalidate();
      utils.production.getKefirMovements.invalidate();
      utils.inventory.listInventory.invalidate();
    },
    onError: (err) => toast.error("Error al finalizar lote: " + err.message),
  });

  const transferMutation = trpc.inventory.transferToGeneral.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Traspaso ${data?.transferNumber ?? ""} realizado con éxito`);
      setIsTransferOpen(false);
      setTransferItems({});
      setTransferNotes("");
      utils.production.getProductionInventory.invalidate();
      utils.production.getKefirMovements.invalidate();
      utils.inventory.listInventory.invalidate();
    },
    onError: (error) => toast.error(error.message || "Error al realizar el traspaso"),
  });

  // ── Handlers ───────────────────────────────────────────────
  const handleCreateBatch = () => {
    createBatchMutation.mutate({ type: batchType, notes: batchNotes });
  };

  const openCompleteDialog = (batchId: number) => {
    setSelectedBatchId(batchId);
    setOutputs([{ productId: 0, quantity: "" }]);
    setInputs([{ productId: 0, quantity: "" }]);
    setIsCompleteBatchOpen(true);
  };

  const handleCompleteBatch = () => {
    if (!selectedBatchId) return;

    const validOutputs = outputs
      .filter((o) => o.productId > 0 && Number(o.quantity) > 0)
      .map((o) => ({ productId: o.productId, quantity: Number(o.quantity) }));

    const validInputs = inputs
      .filter((i) => i.productId > 0 && Number(i.quantity) > 0)
      .map((i) => ({ productId: i.productId, quantity: Number(i.quantity) }));

    completeBatchMutation.mutate({ batchId: selectedBatchId, outputs: validOutputs, inputs: validInputs });
  };

  const handleTransfer = () => {
    const itemsToTransfer = Object.entries(transferItems)
      .map(([id, qty]) => ({ productId: Number(id), quantity: Number(qty) }))
      .filter((i) => i.quantity > 0);

    if (itemsToTransfer.length === 0) {
      toast.error("Seleccione al menos un producto con cantidad mayor a 0");
      return;
    }

    transferMutation.mutate({ items: itemsToTransfer, notes: transferNotes.trim() || undefined });
  };

  const finishedProducts = allProducts?.filter((p: any) => p.category === "finished_product") ?? [];
  const rawMaterials = allProducts?.filter((p: any) => p.category === "raw_material" || p.category === "supplies") ?? [];
  const inventoryWithStock = productionInventory?.filter((i: any) => Number(i.quantity) > 0) ?? [];

  // ── Helpers ────────────────────────────────────────────────
  const safeFormat = (dateVal: any, fmt: string) => {
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return "—";
      return format(d, fmt, { locale: es });
    } catch {
      return "—";
    }
  };

  // ── If there's a query error, show it instead of crashing ──
  if (batchesError || invError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-6">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <h2 className="text-xl font-bold text-slate-700">Error de conexión con el servidor</h2>
        <p className="text-slate-500 max-w-sm">
          {(batchesError || invError)?.message || "No se pudo cargar el módulo de producción."}
        </p>
        <Button onClick={() => { utils.production.getBatches.invalidate(); utils.production.getProductionInventory.invalidate(); }}>
          Reintentar
        </Button>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
      {/* Header */}
      <div className="border-b bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Producción Industrial</h1>
              <p className="text-sm text-slate-500">Gestión de Lotes y Planta</p>
            </div>
          </div>

          <div className="flex gap-2">
            {/* Transfer Dialog */}
            <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <ArrowRightLeft className="h-4 w-4" />
                  Traspasar a General
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Traspaso a Inventario General</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-slate-500 -mt-2 mb-4">Mueve stock del Almacén de Planta a la Tienda principal.</p>
                <div className="max-h-[50vh] overflow-y-auto space-y-3">
                  {inventoryWithStock.length === 0 ? (
                    <p className="text-center text-slate-500 py-6">No hay stock disponible en planta.</p>
                  ) : (
                    inventoryWithStock.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-xl">
                        <div>
                          <p className="font-bold text-slate-900">{item.productName}</p>
                          <p className="text-xs text-slate-500">Disponible: {item.quantity} {item.unit}</p>
                        </div>
                        <Input
                          type="number"
                          placeholder="0"
                          className="w-24"
                          min={0}
                          max={item.quantity}
                          value={transferItems[item.productId] || ""}
                          onChange={(e) => {
                            let val = e.target.value;
                            if (Number(val) > Number(item.quantity)) val = String(item.quantity);
                            setTransferItems({ ...transferItems, [item.productId]: val });
                          }}
                        />
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-4">
                  <Label>Notas (Opcional)</Label>
                  <Input
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                    placeholder="Motivo del traspaso..."
                  />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setIsTransferOpen(false)}>Cancelar</Button>
                  <Button onClick={handleTransfer} disabled={transferMutation.isLoading}>
                    {transferMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Traspaso"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* New Batch Dialog */}
            <Dialog open={isNewBatchOpen} onOpenChange={setIsNewBatchOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nuevo Lote
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Iniciar Lote de Producción</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Tipo de Lote</Label>
                    <select
                      className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm mt-1"
                      value={batchType}
                      onChange={(e: any) => setBatchType(e.target.value)}
                    >
                      <option value="kefir_production">Elaboración de Kéfir</option>
                      <option value="nodule_washing">Lavado de Nódulos</option>
                      <option value="maintenance">Mantenimiento</option>
                    </select>
                  </div>
                  <div>
                    <Label>Notas</Label>
                    <Input
                      value={batchNotes}
                      onChange={(e) => setBatchNotes(e.target.value)}
                      placeholder="Opcional..."
                      className="mt-1"
                    />
                  </div>
                  <Button className="w-full" onClick={handleCreateBatch} disabled={createBatchMutation.isLoading}>
                    {createBatchMutation.isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                    Iniciar Lote
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
        <Tabs defaultValue="batches">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="batches">Lotes de Producción</TabsTrigger>
            <TabsTrigger value="inventory">Inventario en Planta</TabsTrigger>
            <TabsTrigger value="kardex">Kárdex de Planta</TabsTrigger>
          </TabsList>

          {/* ─── TAB 1: Batches ─── */}
          <TabsContent value="batches">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Lote #</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead>Fin</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingBatches ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                      </TableCell>
                    </TableRow>
                  ) : !batches || batches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-slate-400">
                        No hay lotes registrados. Cree uno con el botón "Nuevo Lote".
                      </TableCell>
                    </TableRow>
                  ) : (
                    batches.map((batch: any) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-bold">{batch.batchNumber}</TableCell>
                        <TableCell>
                          {batch.type === "kefir_production" ? "Elaboración de Kéfir" :
                            batch.type === "nodule_washing" ? "Lavado de Nódulos" : "Mantenimiento"}
                        </TableCell>
                        <TableCell>
                          {batch.status === "in_progress" ? (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200">En Progreso</Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Completado</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {safeFormat(batch.startDate || batch.createdAt, "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {batch.endDate ? safeFormat(batch.endDate, "dd/MM/yyyy HH:mm") : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {batch.status === "in_progress" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              onClick={() => openCompleteDialog(batch.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Finalizar Lote
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ─── TAB 2: Inventario en Planta ─── */}
          <TabsContent value="inventory">
            <ProductionInventoryTab inventoryWithStock={inventoryWithStock as any[]} loadingInv={loadingInv} />
          </TabsContent>

          {/* ─── TAB 3: Kárdex ─── */}
          <TabsContent value="kardex">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="text-right">Movimiento</TableHead>
                    <TableHead className="text-right">Stock Resultante</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingMovements ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                      </TableCell>
                    </TableRow>
                  ) : !movements || movements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-slate-400">
                        No hay movimientos registrados aún.
                      </TableCell>
                    </TableRow>
                  ) : (
                    movements.map((mov: any) => (
                      <TableRow key={mov.id}>
                        <TableCell className="text-slate-500">
                          {safeFormat(mov.createdAt, "dd MMM yyyy, HH:mm")}
                        </TableCell>
                        <TableCell className="font-bold text-slate-900">{mov.productName}</TableCell>
                        <TableCell className="text-slate-600">{mov.reason}</TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-sm ${
                              Number(mov.changeAmount) > 0
                                ? "bg-emerald-50 text-emerald-600"
                                : Number(mov.changeAmount) < 0
                                ? "bg-rose-50 text-rose-600"
                                : "bg-slate-50 text-slate-600"
                            }`}
                          >
                            {Number(mov.changeAmount) > 0 ? "+" : ""}
                            {mov.changeAmount}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-slate-500 font-medium">{mov.newQuantity}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Complete Batch Dialog ─── */}
      <Dialog open={isCompleteBatchOpen} onOpenChange={setIsCompleteBatchOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Finalizar Lote de Producción</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 -mt-2">
            Registre los insumos consumidos y los productos elaborados en este lote.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
            {/* Inputs */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold">−</span>
                Insumos Consumidos
              </h3>
              {inputs.map((input, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    className="flex-1 h-9 rounded-md border border-slate-200 text-sm px-2"
                    value={input.productId}
                    onChange={(e) => {
                      const arr = [...inputs];
                      arr[idx].productId = Number(e.target.value);
                      setInputs(arr);
                    }}
                  >
                    <option value={0}>Seleccionar insumo...</option>
                    {rawMaterials.map((rm: any) => (
                      <option key={rm.id} value={rm.id}>{rm.name}</option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    className="w-20 h-9"
                    placeholder="Cant."
                    value={input.quantity}
                    onChange={(e) => {
                      const arr = [...inputs];
                      arr[idx].quantity = e.target.value;
                      setInputs(arr);
                    }}
                  />
                  <button
                    className="text-rose-400 hover:text-rose-600 font-bold text-sm px-2"
                    onClick={() => {
                      const arr = inputs.filter((_, i) => i !== idx);
                      setInputs(arr.length ? arr : [{ productId: 0, quantity: "" }]);
                    }}
                  >✕</button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setInputs([...inputs, { productId: 0, quantity: "" }])}>
                + Agregar insumo
              </Button>
            </div>

            {/* Outputs */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">+</span>
                Productos Elaborados
              </h3>
              {outputs.map((out, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    className="flex-1 h-9 rounded-md border border-slate-200 text-sm px-2"
                    value={out.productId}
                    onChange={(e) => {
                      const arr = [...outputs];
                      arr[idx].productId = Number(e.target.value);
                      setOutputs(arr);
                    }}
                  >
                    <option value={0}>Seleccionar producto...</option>
                    {finishedProducts.map((fp: any) => (
                      <option key={fp.id} value={fp.id}>{fp.name}</option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    className="w-20 h-9"
                    placeholder="Cant."
                    value={out.quantity}
                    onChange={(e) => {
                      const arr = [...outputs];
                      arr[idx].quantity = e.target.value;
                      setOutputs(arr);
                    }}
                  />
                  <button
                    className="text-rose-400 hover:text-rose-600 font-bold text-sm px-2"
                    onClick={() => {
                      const arr = outputs.filter((_, i) => i !== idx);
                      setOutputs(arr.length ? arr : [{ productId: 0, quantity: "" }]);
                    }}
                  >✕</button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setOutputs([...outputs, { productId: 0, quantity: "" }])}>
                + Agregar producto
              </Button>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t pt-4">
            <Button variant="ghost" onClick={() => setIsCompleteBatchOpen(false)}>Cancelar</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleCompleteBatch}
              disabled={completeBatchMutation.isLoading}
            >
              {completeBatchMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar y Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
