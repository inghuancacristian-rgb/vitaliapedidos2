import {
  FlaskConical,
  Loader2,
  ArrowRightLeft,
  Plus,
  CheckCircle,
  AlertCircle,
  CloudUpload,
  Sparkles,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  PRODUCT_LIST_QUERY_OPTIONS,
  PRODUCTION_QUERY_OPTIONS,
  formatProductionDate,
  getFinishedProducts,
  getInventoryWithStock,
  getProductionBatchTypeLabel,
  getProductionRawMaterials,
  toPositiveQuantityItems,
  toTransferQuantityItems,
  type QuantityDraft,
} from "@/lib/production";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ProductionInventoryTab from "@/pages/kefir-control/inventario-produccion/ProductionInventoryTab";
import ProductionKardexTab from "@/pages/kefir-control/auditoria/ProductionKardexTab";

export function Production() {
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isNewBatchOpen, setIsNewBatchOpen] = useState(false);
  const [isCompleteBatchOpen, setIsCompleteBatchOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);

  // Local Data Sync State
  const [hasLocalData, setHasLocalData] = useState(false);
  const [localData, setLocalData] = useState<{ inventory: any[]; batches: any[] } | null>(null);

  // Transfer State
  const [transferItems, setTransferItems] = useState<Record<number, string>>(
    {}
  );
  const [transferNotes, setTransferNotes] = useState("");

  // New Batch State
  const [batchType, setBatchType] = useState<
    "kefir_production" | "nodule_washing" | "maintenance"
  >("kefir_production");
  const [batchNotes, setBatchNotes] = useState("");

  // Complete Batch State
  const [outputs, setOutputs] = useState<QuantityDraft[]>([]);
  const [inputs, setInputs] = useState<QuantityDraft[]>([]);

  const utils = trpc.useContext();

  // Efecto para detectar datos locales listos para sincronización
  useEffect(() => {
    try {
      const kInvStr = localStorage.getItem("kefir_inventory_v3");
      const kBatchesStr = localStorage.getItem("kefir_batches_v3");
      const migrated = localStorage.getItem("kefir_data_migrated_v3");

      if (migrated === "true") return;

      let parsedInv = [];
      let parsedBatches = [];

      if (kInvStr) {
        try { parsedInv = JSON.parse(kInvStr); } catch {}
      }
      if (kBatchesStr) {
        try { parsedBatches = JSON.parse(kBatchesStr); } catch {}
      }

      // Solo mostrar el banner si hay stock o lotes locales
      const hasStock = Array.isArray(parsedInv) && parsedInv.some((item: any) => Number(item.quantity) > 0);
      const hasBatches = Array.isArray(parsedBatches) && parsedBatches.length > 0;

      if (hasStock || hasBatches) {
        setLocalData({
          inventory: Array.isArray(parsedInv) ? parsedInv : [],
          batches: Array.isArray(parsedBatches) ? parsedBatches : [],
        });
        setHasLocalData(true);
      }
    } catch (e) {
      console.warn("Error al leer localstorage de produccion", e);
    }
  }, []);

  // Mutación de migración
  const migrateLocalDataMutation = trpc.production.migrateLocalData.useMutation({
    onSuccess: () => {
      toast.success("¡Datos locales sincronizados con la base de datos central!");
      localStorage.setItem("kefir_data_migrated_v3", "true");
      setHasLocalData(false);
      utils.production.getProductionInventory.invalidate();
      utils.production.getBatches.invalidate();
      utils.production.getKefirMovements.invalidate();
    },
    onError: (err) => {
      toast.error("Error al sincronizar datos locales: " + err.message);
    }
  });

  const handleMigrateLocalData = () => {
    if (!localData) return;

    const simplifiedInv = localData.inventory
      .map((item: any) => ({
        name: String(item.name || item.productName || ""),
        quantity: Number(item.quantity || 0),
        category: String(item.category || "finished_product"),
        unit: String(item.unit || "unidad"),
      }))
      .filter(item => item.name && item.quantity > 0);

    const simplifiedBatches = localData.batches
      .map((batch: any) => ({
        id: String(batch.id || ""),
        type: String(batch.type || "kefir_production"),
        status: String(batch.status || "completed"),
        date: String(batch.date || ""),
        notes: String(batch.notes || ""),
      }))
      .filter(b => b.id);

    migrateLocalDataMutation.mutate({
      inventory: simplifiedInv,
      batches: simplifiedBatches
    });
  };

  // ── Queries ────────────────────────────────────────────────
  const {
    data: batches,
    isLoading: loadingBatches,
    error: batchesError,
  } = trpc.production.getBatches.useQuery(undefined, PRODUCTION_QUERY_OPTIONS);

  const {
    data: productionInventory,
    isLoading: loadingInv,
    error: invError,
  } = trpc.production.getProductionInventory.useQuery(
    undefined,
    PRODUCTION_QUERY_OPTIONS
  );

  const { data: movements, isLoading: loadingMovements } =
    trpc.production.getKefirMovements.useQuery(
      undefined,
      PRODUCTION_QUERY_OPTIONS
    );

  // CORRECTED: listProducts (not getProducts)
  const { data: allProducts } = trpc.inventory.listProducts.useQuery(
    undefined,
    PRODUCT_LIST_QUERY_OPTIONS
  );

  // ── Mutations ──────────────────────────────────────────────
  const createBatchMutation = trpc.production.createBatch.useMutation({
    onSuccess: () => {
      toast.success("Lote iniciado exitosamente");
      setIsNewBatchOpen(false);
      setBatchNotes("");
      utils.production.getBatches.invalidate();
    },
    onError: err => toast.error("Error al iniciar lote: " + err.message),
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
    onError: err => toast.error("Error al finalizar lote: " + err.message),
  });

  const transferMutation = trpc.inventory.transferToGeneral.useMutation({
    onSuccess: (data: any) => {
      toast.success(
        `Traspaso ${data?.transferNumber ?? ""} realizado con éxito`
      );
      setIsTransferOpen(false);
      setTransferItems({});
      setTransferNotes("");
      utils.production.getProductionInventory.invalidate();
      utils.production.getKefirMovements.invalidate();
      utils.inventory.listInventory.invalidate();
    },
    onError: error =>
      toast.error(error.message || "Error al realizar el traspaso"),
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

    const validOutputs = toPositiveQuantityItems(outputs);
    const validInputs = toPositiveQuantityItems(inputs);

    completeBatchMutation.mutate({
      batchId: selectedBatchId,
      outputs: validOutputs,
      inputs: validInputs,
    });
  };

  const handleTransfer = () => {
    const itemsToTransfer = toTransferQuantityItems(transferItems);

    if (itemsToTransfer.length === 0) {
      toast.error("Seleccione al menos un producto con cantidad mayor a 0");
      return;
    }

    transferMutation.mutate({
      items: itemsToTransfer,
      notes: transferNotes.trim() || undefined,
    });
  };

  const finishedProducts = useMemo(
    () => getFinishedProducts(allProducts),
    [allProducts]
  );
  const rawMaterials = useMemo(
    () => getProductionRawMaterials(allProducts),
    [allProducts]
  );
  const inventoryWithStock = useMemo(
    () => getInventoryWithStock(productionInventory),
    [productionInventory]
  );

  // ── Helpers ────────────────────────────────────────────────
  const safeFormat = formatProductionDate;

  // ── If there's a query error, show it instead of crashing ──
  if (batchesError || invError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-6">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <h2 className="text-xl font-bold text-slate-700">
          Error de conexión con el servidor
        </h2>
        <p className="text-slate-500 max-w-sm">
          {(batchesError || invError)?.message ||
            "No se pudo cargar el módulo de producción."}
        </p>
        <Button
          onClick={() => {
            utils.production.getBatches.invalidate();
            utils.production.getProductionInventory.invalidate();
          }}
        >
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
              <h1 className="text-lg font-bold text-slate-900">
                Producción Industrial
              </h1>
              <p className="text-sm text-slate-500">
                Gestión de Lotes y Planta
              </p>
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
                <p className="text-sm text-slate-500 -mt-2 mb-4">
                  Mueve stock del Almacén de Planta a la Tienda principal.
                </p>
                <div className="max-h-[50vh] overflow-y-auto space-y-3">
                  {inventoryWithStock.length === 0 ? (
                    <p className="text-center text-slate-500 py-6">
                      No hay stock disponible en planta.
                    </p>
                  ) : (
                    inventoryWithStock.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 border rounded-xl"
                      >
                        <div>
                          <p className="font-bold text-slate-900">
                            {item.productName}
                          </p>
                          <p className="text-xs text-slate-500">
                            Disponible: {item.quantity} {item.unit}
                          </p>
                        </div>
                        <Input
                          type="number"
                          placeholder="0"
                          className="w-24"
                          min={0}
                          max={item.quantity}
                          value={transferItems[item.productId] || ""}
                          onChange={e => {
                            let val = e.target.value;
                            if (Number(val) > Number(item.quantity))
                              val = String(item.quantity);
                            setTransferItems(current => ({
                              ...current,
                              [item.productId]: val,
                            }));
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
                    onChange={e => setTransferNotes(e.target.value)}
                    placeholder="Motivo del traspaso..."
                  />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setIsTransferOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleTransfer}
                    disabled={transferMutation.isPending}
                  >
                    {transferMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Confirmar Traspaso"
                    )}
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
                      <option value="kefir_production">
                        Elaboración de Kéfir
                      </option>
                      <option value="nodule_washing">Lavado de Nódulos</option>
                      <option value="maintenance">Mantenimiento</option>
                    </select>
                  </div>
                  <div>
                    <Label>Notas</Label>
                    <Input
                      value={batchNotes}
                      onChange={e => setBatchNotes(e.target.value)}
                      placeholder="Opcional..."
                      className="mt-1"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleCreateBatch}
                    disabled={createBatchMutation.isPending}
                  >
                    {createBatchMutation.isPending ? (
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    ) : null}
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
        {/* Banner de Sincronización de Datos Locales */}
        {hasLocalData && localData && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 backdrop-blur-md p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                  <CloudUpload className="h-6 w-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900">
                      ¡Datos locales de producción detectados!
                    </h3>
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Navegador
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 max-w-2xl leading-relaxed">
                    Hemos encontrado <strong>{localData.inventory.filter((i: any) => Number(i.quantity) > 0).length} productos</strong> y <strong>{localData.batches.length} lotes de producción</strong> guardados localmente en este navegador. Sincronízalos en la base de datos central de Railway para poder verlos desde cualquier computadora o dispositivo en tiempo real.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleMigrateLocalData}
                disabled={migrateLocalDataMutation.isPending}
                className="shrink-0 gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 rounded-xl px-5 font-bold h-11"
              >
                {migrateLocalDataMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <CloudUpload className="h-4 w-4" />
                    Sincronizar a la Base de Datos
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

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
                      <TableCell
                        colSpan={6}
                        className="text-center py-10 text-slate-400"
                      >
                        No hay lotes registrados. Cree uno con el botón "Nuevo
                        Lote".
                      </TableCell>
                    </TableRow>
                  ) : (
                    batches.map((batch: any) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-bold">
                          {batch.batchNumber}
                        </TableCell>
                        <TableCell>
                          {getProductionBatchTypeLabel(batch.type)}
                        </TableCell>
                        <TableCell>
                          {batch.status === "in_progress" ? (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                              En Progreso
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                              Completado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {safeFormat(
                            batch.startDate || batch.createdAt,
                            "dd/MM/yyyy HH:mm"
                          )}
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {batch.endDate
                            ? safeFormat(batch.endDate, "dd/MM/yyyy HH:mm")
                            : "—"}
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
            <ProductionInventoryTab
              inventoryWithStock={productionInventory || []}
              loadingInv={loadingInv}
            />
          </TabsContent>

          {/* ─── TAB 3: Kárdex ─── */}
          <TabsContent value="kardex">
            <ProductionKardexTab
              movements={movements ?? []}
              loadingMovements={loadingMovements}
              safeFormat={safeFormat}
            />
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
            Registre los insumos consumidos y los productos elaborados en este
            lote.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
            {/* Inputs */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold">
                  −
                </span>
                Insumos Consumidos
              </h3>
              {inputs.map((input, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    className="flex-1 h-9 rounded-md border border-slate-200 text-sm px-2"
                    value={input.productId}
                    onChange={e => {
                      const productId = Number(e.target.value);
                      setInputs(current =>
                        current.map((item, itemIndex) =>
                          itemIndex === idx ? { ...item, productId } : item
                        )
                      );
                    }}
                  >
                    <option value={0}>Seleccionar insumo...</option>
                    {rawMaterials.map((rm: any) => (
                      <option key={rm.id} value={rm.id}>
                        {rm.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    className="w-20 h-9"
                    placeholder="Cant."
                    value={input.quantity}
                    onChange={e => {
                      const quantity = e.target.value;
                      setInputs(current =>
                        current.map((item, itemIndex) =>
                          itemIndex === idx ? { ...item, quantity } : item
                        )
                      );
                    }}
                  />
                  <button
                    className="text-rose-400 hover:text-rose-600 font-bold text-sm px-2"
                    onClick={() => {
                      setInputs(current => {
                        const nextInputs = current.filter(
                          (_, itemIndex) => itemIndex !== idx
                        );
                        return nextInputs.length
                          ? nextInputs
                          : [{ productId: 0, quantity: "" }];
                      });
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setInputs(current => [
                    ...current,
                    { productId: 0, quantity: "" },
                  ])
                }
              >
                + Agregar insumo
              </Button>
            </div>

            {/* Outputs */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                  +
                </span>
                Productos Elaborados
              </h3>
              {outputs.map((out, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    className="flex-1 h-9 rounded-md border border-slate-200 text-sm px-2"
                    value={out.productId}
                    onChange={e => {
                      const productId = Number(e.target.value);
                      setOutputs(current =>
                        current.map((item, itemIndex) =>
                          itemIndex === idx ? { ...item, productId } : item
                        )
                      );
                    }}
                  >
                    <option value={0}>Seleccionar producto...</option>
                    {finishedProducts.map((fp: any) => (
                      <option key={fp.id} value={fp.id}>
                        {fp.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    className="w-20 h-9"
                    placeholder="Cant."
                    value={out.quantity}
                    onChange={e => {
                      const quantity = e.target.value;
                      setOutputs(current =>
                        current.map((item, itemIndex) =>
                          itemIndex === idx ? { ...item, quantity } : item
                        )
                      );
                    }}
                  />
                  <button
                    className="text-rose-400 hover:text-rose-600 font-bold text-sm px-2"
                    onClick={() => {
                      setOutputs(current => {
                        const nextOutputs = current.filter(
                          (_, itemIndex) => itemIndex !== idx
                        );
                        return nextOutputs.length
                          ? nextOutputs
                          : [{ productId: 0, quantity: "" }];
                      });
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setOutputs(current => [
                    ...current,
                    { productId: 0, quantity: "" },
                  ])
                }
              >
                + Agregar producto
              </Button>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t pt-4">
            <Button
              variant="ghost"
              onClick={() => setIsCompleteBatchOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleCompleteBatch}
              disabled={completeBatchMutation.isPending}
            >
              {completeBatchMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirmar y Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
