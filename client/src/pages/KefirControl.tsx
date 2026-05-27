import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AddProductDialog } from "@/components/AddProductDialog";
import { EditProductDialog } from "@/components/EditProductDialog";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Calendar,
  CheckCircle2,
  Clock,
  Droplets,
  DollarSign,
  Factory,
  FileText,
  FlaskConical,
  CheckCircle,
  Eye,
  Filter,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Loader2,
  Package2,
  RefreshCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
  LineChart,
  Store,
  Tag,
  ShoppingCart,
  Trash2,
  Edit2,
} from "lucide-react";

type SectionKey =
  | "inicio"
  | "productos"
  | "lotes"
  | "ordenes"
  | "auditoria"
  | "nodulos"
  | "reportes"
  | "inventario"
  | "calidad"
  | "costos"
  | "rendimientos";

type ProductionRow = {
  id: number | string;
  productId: number;
  quantity: number;
  productName?: string;
  productCode?: string;
  category?: string;
  unit?: string;
  minStock?: number;
  estimatedValue?: number;
  isLowStock?: boolean;
};

const sections: Array<{
  key: SectionKey;
  label: string;
  href: string;
  icon: any;
}> = [
  { key: "inicio", label: "Inicio", href: "/kefir-control/inicio", icon: Factory },
  { key: "productos", label: "Productos", href: "/kefir-control/productos", icon: Store },
  { key: "lotes", label: "Lotes", href: "/kefir-control/lotes", icon: Boxes },
  { key: "ordenes", label: "Órdenes", href: "/kefir-control/ordenes", icon: ClipboardList },
  { key: "auditoria", label: "Auditoría", href: "/kefir-control/auditoria", icon: FileText },
  { key: "nodulos", label: "Nódulos", href: "/kefir-control/nodulos", icon: Droplets },
  { key: "reportes", label: "Reportes", href: "/kefir-control/reportes", icon: BarChart3 },
  { key: "inventario", label: "Inventario de Producción", href: "/kefir-control/inventario", icon: Package2 },
  { key: "calidad", label: "Calidad", href: "/kefir-control/calidad", icon: ShieldCheck },
  { key: "costos", label: "Costos", href: "/kefir-control/costos", icon: Wallet },
  { key: "rendimientos", label: "Rendimientos", href: "/kefir-control/rendimientos", icon: LineChart },
];

const categoryLabels: Record<string, string> = {
  finished_product: "Producto terminado",
  raw_material: "Materia prima",
  supplies: "Suministros",
  insumo: "Insumo",
  producto: "Producto",
  materia: "Materia",
  envase: "Envase",
  other: "Otro",
};

const categoryBadges: Record<string, string> = {
  finished_product: "bg-emerald-50 text-emerald-700 border-emerald-200",
  raw_material: "bg-sky-50 text-sky-700 border-sky-200",
  supplies: "bg-amber-50 text-amber-700 border-amber-200",
  insumo: "bg-violet-50 text-violet-700 border-violet-200",
  producto: "bg-emerald-50 text-emerald-700 border-emerald-200",
  materia: "bg-sky-50 text-sky-700 border-sky-200",
  envase: "bg-orange-50 text-orange-700 border-orange-200",
  other: "bg-slate-100 text-slate-700 border-slate-200",
};

function getSectionFromPath(pathname: string): SectionKey {
  const raw = pathname.split("/")[2] || "inventario";
  if (
    raw === "inicio" ||
    raw === "productos" ||
    raw === "lotes" ||
    raw === "ordenes" ||
    raw === "auditoria" ||
    raw === "nodulos" ||
    raw === "reportes" ||
    raw === "inventario" ||
    raw === "calidad" ||
    raw === "costos" ||
    raw === "rendimientos"
  ) {
    return raw;
  }
  return "inventario";
}

function formatCurrencyBs(value: number) {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    maximumFractionDigits: 2,
  }).format(value);
}

function getCategoryLabel(category?: string | null) {
  if (!category) return "Otro";
  return categoryLabels[category] || category.replaceAll("_", " ");
}

function getCategoryBadgeClass(category?: string | null) {
  if (!category) return categoryBadges.other;
  return categoryBadges[category] || categoryBadges.other;
}

function normalizeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function SectionPlaceholder({ label }: { label: string }) {
  return (
    <Card className="border-dashed border-slate-200 bg-white/80 shadow-none">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <FlaskConical className="h-6 w-6 text-slate-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{label}</h2>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            Este submódulo todavía no está migrado. Vamos a ir ordenándolo por partes sin romper la estructura general.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ProductsView() {
  const { data: products = [], isLoading, refetch } = trpc.inventory.listProducts.useQuery(undefined, {
    staleTime: 60_000,
    retry: 2,
  });
  const { data: inventory = [] } = trpc.inventory.listInventory.useQuery(undefined, {
    staleTime: 30_000,
    retry: 2,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const inventoryByProductId = useMemo(() => {
    const map = new Map<number, any>();
    for (const item of inventory as any[]) {
      map.set(item.productId, item);
    }
    return map;
  }, [inventory]);

  const categories = [
    { id: "all", label: "Todos" },
    { id: "finished_product", label: "Producto terminado" },
    { id: "raw_material", label: "Materia prima" },
    { id: "supplies", label: "Suministros" },
    { id: "insumo", label: "Insumos" },
  ];

  const filteredProducts = useMemo(() => {
    if (!products) return [];

    return (products as any[]).filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, categoryFilter]);

  const productCounts = useMemo(() => {
    if (!products) return { total: 0, finished: 0, raw: 0, supplies: 0, insumo: 0 };

    return {
      total: products.length,
      finished: products.filter((p: any) => p.category === "finished_product").length,
      raw: products.filter((p: any) => p.category === "raw_material").length,
      supplies: products.filter((p: any) => p.category === "supplies").length,
      insumo: products.filter((p: any) => p.category === "insumo").length,
    };
  }, [products]);

  const totalCatalogValue = useMemo(() => {
    return (filteredProducts as any[]).reduce((sum, product) => {
      const stock = normalizeNumber(inventoryByProductId.get(product.id)?.quantity, 0);
      const unitValue = normalizeNumber(product.salePrice ?? product.price ?? 0, 0);
      return sum + stock * unitValue;
    }, 0);
  }, [filteredProducts, inventoryByProductId]);

  if (isLoading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center text-sm text-slate-500">
        Cargando productos...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Total productos</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{productCounts.total}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Terminados</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{productCounts.finished}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Materia prima</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{productCounts.raw + productCounts.supplies + productCounts.insumo}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Valor catalogado</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{formatCurrencyBs(totalCatalogValue / 100)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por nombre o código..."
                className="h-11 rounded-2xl border-slate-200 bg-white pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={categoryFilter === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter(cat.id)}
                  className="whitespace-nowrap rounded-full"
                >
                  {cat.label}
                </Button>
              ))}
              <AddProductDialog onProductAdded={() => refetch()} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Catálogo de Productos</h3>
                <p className="text-sm text-slate-500">Define y categoriza productos e insumos del módulo de producción.</p>
              </div>
              <Badge variant="outline" className="bg-slate-50 text-slate-700">
                {filteredProducts.length} ítems
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product: any) => {
                const stockItem = inventoryByProductId.get(product.id);
                const stockQty = normalizeNumber(stockItem?.quantity, 0);
                const minStock = normalizeNumber(stockItem?.minStock, 0);
                const isLow = stockQty <= minStock;

                return (
                  <Card key={product.id} className="overflow-hidden border-slate-200/80 transition-shadow hover:shadow-md">
                    <div className="aspect-video bg-slate-100 relative">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-300">
                          <Package2 className="h-10 w-10" />
                        </div>
                      )}
                      <div className="absolute right-2 top-2">
                        <Badge variant="outline" className={getCategoryBadgeClass(product.category)}>
                          {getCategoryLabel(product.category)}
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="space-y-3 p-4">
                      <div>
                        <h4 className="text-lg font-bold text-slate-900">{product.name}</h4>
                        <p className="text-xs text-slate-500">Cod: {product.code}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-2xl bg-slate-50 px-3 py-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Compra</p>
                          <p className="mt-1 font-black text-slate-900">{formatCurrency(product.price)}</p>
                        </div>
                        <div className="rounded-2xl bg-emerald-50 px-3 py-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Venta</p>
                          <p className="mt-1 font-black text-emerald-900">{formatCurrency(product.salePrice)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-2xl bg-sky-50 px-3 py-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">Stock</p>
                          <p className="mt-1 font-black text-sky-900">{stockQty}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Mín.</p>
                          <p className="mt-1 font-black text-slate-900">{minStock}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className={isLow ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}
                        >
                          {isLow ? "Stock bajo" : "Stock OK"}
                        </Badge>

                        <Button size="sm" variant="outline" className="gap-2" onClick={() => setSelectedProduct(product)}>
                          <Edit2 className="h-4 w-4" />
                          Editar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredProducts.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-14 text-center text-sm text-slate-500">
                No se encontraron productos con estos criterios.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-slate-200/80 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-slate-500" />
                <h3 className="text-base font-bold text-slate-900">Resumen del catálogo</h3>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-600">Total</span>
                  <span className="font-black text-slate-900">{productCounts.total}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-600">Terminados</span>
                  <span className="font-black text-slate-900">{productCounts.finished}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-600">Materia prima</span>
                  <span className="font-black text-slate-900">{productCounts.raw}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-600">Suministros</span>
                  <span className="font-black text-slate-900">{productCounts.supplies}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-600">Insumos</span>
                  <span className="font-black text-slate-900">{productCounts.insumo}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/70 shadow-sm">
            <CardContent className="p-5">
              <div className="flex gap-3">
                <ShoppingCart className="h-5 w-5 shrink-0 text-blue-600" />
                <div>
                  <h4 className="text-sm font-bold text-blue-800">Producción y catálogo</h4>
                  <p className="mt-1 text-xs leading-relaxed text-blue-700">
                    Aquí dejaremos los productos y sus roles de producción bien organizados para que luego el resto de módulos migre con orden.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedProduct && (
        <EditProductDialog
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onOpenChange={(open) => {
            if (!open) setSelectedProduct(null);
          }}
          onProductUpdated={() => {
            setSelectedProduct(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function BatchesView() {
  const utils = trpc.useContext();
  const { data: batches = [], isLoading: loadingBatches, refetch: refetchBatches } =
    trpc.production.getBatches.useQuery(undefined, {
      retry: 2,
      refetchOnWindowFocus: true,
    });
  const { data: products = [], isLoading: loadingProducts } = trpc.inventory.listProducts.useQuery(undefined, {
    retry: 2,
    refetchOnWindowFocus: true,
  });

  const [batchType, setBatchType] = useState<"kefir_production" | "nodule_washing" | "maintenance">("kefir_production");
  const [batchNotes, setBatchNotes] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [outputs, setOutputs] = useState<Array<{ productId: number; quantity: string }>>([
    { productId: 0, quantity: "" },
  ]);
  const [inputs, setInputs] = useState<Array<{ productId: number; quantity: string }>>([
    { productId: 0, quantity: "" },
  ]);

  const finishedProducts = useMemo(
    () => (products as any[]).filter((product) => product.category === "finished_product"),
    [products]
  );
  const rawMaterials = useMemo(
    () =>
      (products as any[]).filter((product) =>
        ["raw_material", "supplies", "insumo"].includes(product.category)
      ),
    [products]
  );
  const selectedBatch = useMemo(
    () => (batches as any[]).find((batch) => batch.id === selectedBatchId) ?? null,
    [batches, selectedBatchId]
  );
  const activeBatches = useMemo(
    () => (batches as any[]).filter((batch) => batch.status === "in_progress"),
    [batches]
  );
  const batchCounts = useMemo(() => {
    const list = batches as any[];
    return {
      total: list.length,
      active: list.filter((batch) => batch.status === "in_progress").length,
      completed: list.filter((batch) => batch.status === "completed").length,
    };
  }, [batches]);

  const createBatchMutation = trpc.production.createBatch.useMutation({
    onSuccess: (result) => {
      toast.success(`Lote ${result.batchNumber} iniciado`);
      setBatchNotes("");
      setBatchType("kefir_production");
      utils.production.getBatches.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "No se pudo iniciar el lote");
    },
  });

  const completeBatchMutation = trpc.production.completeBatch.useMutation({
    onSuccess: () => {
      toast.success("Lote finalizado y stock actualizado");
      setSelectedBatchId(null);
      setOutputs([{ productId: 0, quantity: "" }]);
      setInputs([{ productId: 0, quantity: "" }]);
      utils.production.getBatches.invalidate();
      utils.production.getProductionInventory.invalidate();
      utils.production.getKefirMovements.invalidate();
      utils.inventory.listInventory.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "No se pudo finalizar el lote");
    },
  });

  const handleCreateBatch = () => {
    createBatchMutation.mutate({
      type: batchType,
      notes: batchNotes.trim() || undefined,
    });
  };

  const resetCompleteForm = (batchId: number | null) => {
    setSelectedBatchId(batchId);
    setOutputs([{ productId: 0, quantity: "" }]);
    setInputs([{ productId: 0, quantity: "" }]);
  };

  const handleCompleteBatch = () => {
    if (!selectedBatchId) {
      toast.error("Selecciona un lote para finalizar");
      return;
    }

    const validOutputs = outputs
      .filter((item) => item.productId > 0 && Number(item.quantity) > 0)
      .map((item) => ({ productId: item.productId, quantity: Number(item.quantity) }));
    const validInputs = inputs
      .filter((item) => item.productId > 0 && Number(item.quantity) > 0)
      .map((item) => ({ productId: item.productId, quantity: Number(item.quantity) }));

    if (validOutputs.length === 0) {
      toast.error("Agrega al menos un producto elaborado con cantidad mayor a 0");
      return;
    }

    completeBatchMutation.mutate({
      batchId: selectedBatchId,
      outputs: validOutputs,
      inputs: validInputs,
    });
  };

  const formatDate = (value: unknown) => {
    if (!value) return "—";
    const date = new Date(value as any);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("es-BO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const typeLabel = (type?: string) => {
    if (type === "kefir_production") return "Elaboracion de Kefir";
    if (type === "nodule_washing") return "Lavado de Nodulos";
    if (type === "maintenance") return "Mantenimiento";
    return "Otro";
  };

  const statusBadgeClass = (status?: string) => {
    if (status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    return "border-amber-200 bg-amber-50 text-amber-700";
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Total lotes</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{batchCounts.total}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">En progreso</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{batchCounts.active}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Completados</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{batchCounts.completed}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Nuevo lote</h3>
                <p className="text-sm text-slate-500">Abre un lote de produccion, lavado o mantenimiento.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchBatches()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Actualizar
              </Button>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Tipo de lote</label>
                <select
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-400"
                  value={batchType}
                  onChange={(e) => setBatchType(e.target.value as any)}
                >
                  <option value="kefir_production">Elaboracion de Kefir</option>
                  <option value="nodule_washing">Lavado de Nodulos</option>
                  <option value="maintenance">Mantenimiento</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Notas</label>
                <Input
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  placeholder="Notas del lote..."
                  className="h-11 rounded-2xl bg-slate-50/70"
                />
              </div>

              <Button
                className="h-11 w-full rounded-2xl"
                onClick={handleCreateBatch}
                disabled={createBatchMutation.isPending}
              >
                {createBatchMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Iniciar lote
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="space-y-4 p-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Finalizar lote</h3>
              <p className="text-sm text-slate-500">
                Registra insumos consumidos y productos generados para actualizar el inventario.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Seleccionar lote activo</label>
              <select
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-400"
                value={selectedBatchId ?? ""}
                onChange={(e) => resetCompleteForm(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Elegir lote...</option>
                {activeBatches.map((batch: any) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.batchNumber} - {typeLabel(batch.type)}
                  </option>
                ))}
              </select>
            </div>

            {selectedBatch && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Lote seleccionado</p>
                <p className="mt-1 font-bold text-slate-900">{selectedBatch.batchNumber}</p>
                <p className="text-sm text-slate-500">{typeLabel(selectedBatch.type)}</p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Productos elaborados</label>
                {outputs.map((row, index) => (
                  <div key={`out-${index}`} className="grid grid-cols-[1fr_110px_40px] gap-2">
                    <select
                      className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-400"
                      value={row.productId}
                      onChange={(e) => {
                        const next = [...outputs];
                        next[index].productId = Number(e.target.value);
                        setOutputs(next);
                      }}
                    >
                      <option value={0}>Producto...</option>
                      {finishedProducts.map((product: any) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Cant."
                      value={row.quantity}
                      onChange={(e) => {
                        const next = [...outputs];
                        next[index].quantity = e.target.value;
                        setOutputs(next);
                      }}
                      className="h-11 rounded-2xl bg-slate-50/70"
                    />
                    <button
                      type="button"
                      className="rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                      onClick={() =>
                        setOutputs((current) => {
                          const next = current.filter((_, currentIndex) => currentIndex !== index);
                          return next.length ? next : [{ productId: 0, quantity: "" }];
                        })
                      }
                    >
                      -
                    </button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full rounded-2xl"
                  onClick={() => setOutputs((current) => [...current, { productId: 0, quantity: "" }])}
                >
                  Agregar producto
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Insumos consumidos</label>
                {inputs.map((row, index) => (
                  <div key={`in-${index}`} className="grid grid-cols-[1fr_110px_40px] gap-2">
                    <select
                      className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-400"
                      value={row.productId}
                      onChange={(e) => {
                        const next = [...inputs];
                        next[index].productId = Number(e.target.value);
                        setInputs(next);
                      }}
                    >
                      <option value={0}>Insumo...</option>
                      {rawMaterials.map((product: any) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Cant."
                      value={row.quantity}
                      onChange={(e) => {
                        const next = [...inputs];
                        next[index].quantity = e.target.value;
                        setInputs(next);
                      }}
                      className="h-11 rounded-2xl bg-slate-50/70"
                    />
                    <button
                      type="button"
                      className="rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                      onClick={() =>
                        setInputs((current) => {
                          const next = current.filter((_, currentIndex) => currentIndex !== index);
                          return next.length ? next : [{ productId: 0, quantity: "" }];
                        })
                      }
                    >
                      -
                    </button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full rounded-2xl"
                  onClick={() => setInputs((current) => [...current, { productId: 0, quantity: "" }])}
                >
                  Agregar insumo
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={() => {
                  setSelectedBatchId(null);
                  setOutputs([{ productId: 0, quantity: "" }]);
                  setInputs([{ productId: 0, quantity: "" }]);
                }}
              >
                Limpiar
              </Button>
              <Button
                className="rounded-2xl"
                onClick={handleCompleteBatch}
                disabled={completeBatchMutation.isPending || loadingProducts}
              >
                {completeBatchMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Finalizar lote
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-slate-200/80 shadow-sm">
        <CardContent className="p-0">
          {loadingBatches ? (
            <div className="flex min-h-[260px] items-center justify-center text-sm text-slate-500">
              Cargando lotes...
            </div>
          ) : (batches as any[]).length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 px-6 text-center">
              <Boxes className="h-12 w-12 text-slate-300" />
              <h3 className="text-lg font-bold text-slate-800">Aun no hay lotes registrados</h3>
              <p className="max-w-md text-sm text-slate-500">
                Inicia un lote desde el panel superior para empezar a registrar movimientos.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">Lote</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">Tipo</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">Estado</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">Inicio</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">Fin</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-700">Accion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(batches as any[]).map((batch) => (
                    <tr key={batch.id}>
                      <td className="px-4 py-4 font-bold text-slate-900">{batch.batchNumber}</td>
                      <td className="px-4 py-4 text-slate-700">{typeLabel(batch.type)}</td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className={statusBadgeClass(batch.status)}>
                          {batch.status === "completed" ? "Completado" : "En progreso"}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-slate-500">{formatDate(batch.startDate || batch.createdAt)}</td>
                      <td className="px-4 py-4 text-slate-500">{formatDate(batch.endDate)}</td>
                      <td className="px-4 py-4 text-right">
                        {batch.status === "in_progress" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-2xl border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => resetCompleteForm(batch.id)}
                          >
                            Finalizar
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">Sin acciones</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function OrdersView() {
  const utils = trpc.useContext();
  const { data: orders = [], isLoading, refetch } = trpc.orders.list.useQuery(undefined, {
    retry: 2,
    refetchOnWindowFocus: true,
  });
  const { data: deliveryPersons = [] } = trpc.users.listDeliveryPersons.useQuery(undefined, {
    retry: 2,
    refetchOnWindowFocus: true,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deliveryPersonFilter, setDeliveryPersonFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [statusDraft, setStatusDraft] = useState<"pending" | "assigned" | "in_transit" | "delivered" | "cancelled">("assigned");
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);
  const [cancelledBy, setCancelledBy] = useState<"client" | "company" | "system">("client");
  const [cancelReason, setCancelReason] = useState("");

  const { data: orderDetails, isLoading: loadingDetails } = trpc.orders.getDetails.useQuery(
    { orderId: selectedOrderId ?? 0 },
    { enabled: selectedOrderId !== null }
  );

  const updateStatusMutation = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Estado del pedido actualizado");
      setSelectedOrderId(null);
      utils.orders.list.invalidate();
      utils.orders.getDetails.invalidate();
      utils.inventory.listInventory.invalidate();
    },
    onError: (error) => toast.error(error.message || "No se pudo actualizar el pedido"),
  });

  const dismissMutation = trpc.orders.dismissOrder.useMutation({
    onSuccess: () => {
      toast.success("Pedido dado de baja");
      setCancelTargetId(null);
      setCancelReason("");
      utils.orders.list.invalidate();
      utils.orders.getDetails.invalidate();
      utils.inventory.listInventory.invalidate();
    },
    onError: (error) => toast.error(error.message || "No se pudo cancelar el pedido"),
  });

  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return (orders as any[])
      .filter((order) => {
        const clientLabel = String(
          order.clientName ||
            order.customerName ||
            order.customer?.name ||
            order.customerNumber ||
            order.customerId ||
            ""
        ).toLowerCase();
        const matchesSearch =
          String(order.orderNumber || "").toLowerCase().includes(term) ||
          clientLabel.includes(term) ||
          String(order.zone || "").toLowerCase().includes(term);
        const matchesStatus = statusFilter === "all" || order.status === statusFilter;
        const matchesDeliveryPerson =
          deliveryPersonFilter === "all" ||
          (deliveryPersonFilter === "none"
            ? !order.deliveryPersonId
            : String(order.deliveryPersonId) === deliveryPersonFilter);
        const orderDate = order.deliveryDate || order.createdAt?.slice?.(0, 10) || "";
        const matchesDate = !dateFilter || orderDate === dateFilter;
        return matchesSearch && matchesStatus && matchesDeliveryPerson && matchesDate;
      })
      .sort((a, b) => {
        const dateA = String(a.deliveryDate || a.createdAt || "");
        const dateB = String(b.deliveryDate || b.createdAt || "");
        const timeA = String(a.deliveryTime || "99:99");
        const timeB = String(b.deliveryTime || "99:99");
        return dateB.localeCompare(dateA) || timeB.localeCompare(timeA);
      });
  }, [orders, searchTerm, statusFilter, deliveryPersonFilter, dateFilter]);

  const stats = useMemo(() => {
    const list = orders as any[];
    return {
      total: list.length,
      pending: list.filter((order) => order.status === "pending").length,
      active: list.filter((order) => ["assigned", "in_transit", "rescheduled"].includes(order.status)).length,
      delivered: list.filter((order) => order.status === "delivered").length,
      cancelled: list.filter((order) => order.status === "cancelled").length,
    };
  }, [orders]);

  const selectedOrder = useMemo(
    () => (orders as any[]).find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );

  const getStatusClass = (status: string) => {
    switch (status) {
      case "pending":
        return "border-amber-200 bg-amber-50 text-amber-700";
      case "assigned":
        return "border-sky-200 bg-sky-50 text-sky-700";
      case "in_transit":
        return "border-violet-200 bg-violet-50 text-violet-700";
      case "rescheduled":
        return "border-orange-200 bg-orange-50 text-orange-700";
      case "delivered":
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
      case "cancelled":
        return "border-rose-200 bg-rose-50 text-rose-700";
      default:
        return "border-slate-200 bg-slate-50 text-slate-700";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pendiente",
      assigned: "Asignado",
      in_transit: "En transito",
      rescheduled: "Reprogramado",
      delivered: "Entregado",
      cancelled: "Cancelado",
    };
    return labels[status] || status;
  };

  const getClientLabel = (order: any) =>
    order.clientName ||
    order.customerName ||
    order.customer?.name ||
    order.customerNumber ||
    `Cliente #${order.customerId || order.id}`;

  const getContactValue = (order: any) =>
    order.customerWhatsapp || order.customerPhone || order.customerNumber || "";

  const getDeliveryPersonLabel = (order: any) =>
    order.deliveryPersonName || deliveryPersons.find((person: any) => person.id === order.deliveryPersonId)?.username || "Sin asignar";

  const openOrderDetails = (order: any) => {
    setSelectedOrderId(order.id);
    setStatusDraft(order.status || "assigned");
  };

  const handleQuickDeliver = (orderId: number) => {
    updateStatusMutation.mutate({ orderId, status: "delivered" });
  };

  const handleSaveStatus = () => {
    if (!selectedOrderId) return;
    updateStatusMutation.mutate({ orderId: selectedOrderId, status: statusDraft });
  };

  const handleDismiss = () => {
    if (!cancelTargetId || cancelReason.trim().length < 3) return;
    dismissMutation.mutate({
      orderId: cancelTargetId,
      cancelledBy,
      reason: cancelReason.trim(),
    });
  };

  const formatMoney = (value: number) => formatCurrency(value);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Total</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Pendientes</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Activos</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{stats.active}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Entregados</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{stats.delivered}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Cancelados</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{stats.cancelled}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Filtros de ordenes</h3>
              <p className="text-sm text-slate-500">Revisa, filtra y actualiza pedidos desde un solo lugar.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Actualizar
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setDeliveryPersonFilter("all");
                setDateFilter("");
              }}>
                Limpiar filtros
              </Button>
              <Link href="/create-order">
                <Button size="sm" className="gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Nuevo pedido
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-4">
            <div className="relative lg:col-span-2">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por pedido, cliente o zona..."
                className="h-11 rounded-2xl border-slate-200 bg-white pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="assigned">Asignados</SelectItem>
                <SelectItem value="in_transit">En transito</SelectItem>
                <SelectItem value="rescheduled">Reprogramados</SelectItem>
                <SelectItem value="delivered">Entregados</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>

            <Select value={deliveryPersonFilter} onValueChange={setDeliveryPersonFilter}>
              <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white">
                <SelectValue placeholder="Repartidor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los repartidores</SelectItem>
                <SelectItem value="none">Sin asignar</SelectItem>
                {(deliveryPersons as any[]).map((person) => (
                  <SelectItem key={person.id} value={String(person.id)}>
                    {person.username || person.name || `#${person.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 lg:grid-cols-[240px_1fr]">
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-11 rounded-2xl border-slate-200 bg-white pl-10"
              />
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Filter className="h-4 w-4" />
              <span>{filteredOrders.length} pedidos visibles</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-slate-200/80 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex min-h-[260px] items-center justify-center text-sm text-slate-500">
              Cargando ordenes...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 px-6 text-center">
              <ClipboardList className="h-12 w-12 text-slate-300" />
              <h3 className="text-lg font-bold text-slate-800">No hay ordenes que coincidan</h3>
              <p className="max-w-md text-sm text-slate-500">
                Ajusta los filtros o crea un nuevo pedido para comenzar.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">Pedido</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">Cliente</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">Zona</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">Fecha</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-700">Total</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">Estado</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">Repartidor</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredOrders.map((order: any) => (
                    <tr key={order.id}>
                      <td className="px-4 py-4 font-bold text-slate-900">#{order.orderNumber}</td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-900">{getClientLabel(order)}</p>
                          <p className="text-xs text-slate-500">{getContactValue(order) || "Sin contacto"}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{order.zone || "Sin zona"}</td>
                      <td className="px-4 py-4 text-slate-500">
                        <div className="flex flex-col">
                          <span>{order.deliveryDate || order.createdAt?.slice?.(0, 10) || "—"}</span>
                          <span className="text-xs">{order.deliveryTime || "Sin hora"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-slate-900">{formatMoney(order.totalPrice || 0)}</td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className={getStatusClass(order.status)}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{getDeliveryPersonLabel(order)}</td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-2xl"
                            onClick={() => openOrderDetails(order)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ver
                          </Button>
                          {order.status !== "delivered" && order.status !== "cancelled" && (
                            <Button
                              size="sm"
                              className="rounded-2xl"
                              onClick={() => handleQuickDeliver(order.id)}
                              disabled={updateStatusMutation.isPending}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Entregar
                            </Button>
                          )}
                          {order.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-2xl border-rose-200 text-rose-700 hover:bg-rose-50"
                              onClick={() => {
                                setCancelTargetId(order.id);
                                setCancelReason("");
                                setCancelledBy("client");
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={selectedOrderId !== null} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalle del pedido</DialogTitle>
            <DialogDescription>Revisa el pedido y actualiza su estado operativo.</DialogDescription>
          </DialogHeader>

          {loadingDetails || !orderDetails ? (
            <div className="py-8 text-center text-sm text-slate-500">Cargando detalle...</div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Pedido</p>
                  <p className="mt-1 text-lg font-black text-slate-900">#{orderDetails.order.orderNumber}</p>
                  <p className="text-sm text-slate-600">{getStatusLabel(orderDetails.order.status)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Cliente</p>
                  <p className="mt-1 text-lg font-black text-slate-900">{orderDetails.customer?.name || getClientLabel(orderDetails.order)}</p>
                  <p className="text-sm text-slate-600">{orderDetails.order.zone || "Sin zona"}</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Fecha</p>
                  <p className="mt-1 font-semibold text-slate-900">{orderDetails.order.deliveryDate || "—"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Hora</p>
                  <p className="mt-1 font-semibold text-slate-900">{orderDetails.order.deliveryTime || "—"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Total</p>
                  <p className="mt-1 font-semibold text-slate-900">{formatMoney(orderDetails.order.totalPrice || 0)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-bold text-slate-900">Items del pedido</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {(orderDetails.items || []).map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between px-4 py-3 text-sm">
                      <div>
                        <p className="font-semibold text-slate-900">{item.productName || `Producto #${item.productId}`}</p>
                        <p className="text-xs text-slate-500">Cantidad: {item.quantity}</p>
                      </div>
                      <p className="font-bold text-slate-900">{formatMoney(item.price || 0)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Nuevo estado</label>
                  <Select value={statusDraft} onValueChange={(value) => setStatusDraft(value as any)}>
                    <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="assigned">Asignado</SelectItem>
                      <SelectItem value="in_transit">En transito</SelectItem>
                      <SelectItem value="rescheduled">Reprogramado</SelectItem>
                      <SelectItem value="delivered">Entregado</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="h-11 rounded-2xl"
                  onClick={handleSaveStatus}
                  disabled={updateStatusMutation.isPending}
                >
                  {updateStatusMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Guardar estado
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={cancelTargetId !== null} onOpenChange={(open) => !open && setCancelTargetId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cancelar pedido</DialogTitle>
            <DialogDescription>Indica el motivo para registrar la baja del pedido.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Cancelado por</label>
              <Select value={cancelledBy} onValueChange={(value) => setCancelledBy(value as any)}>
                <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Cliente</SelectItem>
                  <SelectItem value="company">Empresa</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Motivo</label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Describe el motivo de la baja..."
                className="min-h-28 rounded-2xl border-slate-200 bg-white"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCancelTargetId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleDismiss}
              disabled={dismissMutation.isPending || cancelReason.trim().length < 3}
            >
              {dismissMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar baja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AuditView() {
  const utils = trpc.useContext();
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [action, setAction] = useState("all");
  const [userId, setUserId] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const { data: users = [] } = trpc.users.list.useQuery(undefined, {
    retry: 2,
    refetchOnWindowFocus: true,
  });

  const { data: stats } = trpc.audit.stats.useQuery(
    {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    },
    { retry: 2, refetchOnWindowFocus: true }
  );

  const { data: logs = [], isLoading, refetch } = trpc.audit.list.useQuery(
    {
      entityType: entityType.trim() || undefined,
      entityId: entityId.trim() ? Number(entityId) : undefined,
      action: action === "all" ? undefined : (action as "CREATE" | "UPDATE" | "DELETE"),
      userId: userId === "all" ? undefined : Number(userId),
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      limit: 150,
      offset: 0,
    },
    { retry: 2, refetchOnWindowFocus: true }
  );

  const actionTotals = useMemo(() => {
    const rows = (stats?.byAction || []) as any[];
    return {
      create: rows.find((row) => row.action === "CREATE")?.count || 0,
      update: rows.find((row) => row.action === "UPDATE")?.count || 0,
      delete: rows.find((row) => row.action === "DELETE")?.count || 0,
    };
  }, [stats]);

  const entityTotals = useMemo(() => {
    const rows = (stats?.byEntity || []) as any[];
    return rows.slice(0, 3);
  }, [stats]);

  const userTotals = useMemo(() => {
    const rows = (stats?.byUser || []) as any[];
    return rows.slice(0, 5);
  }, [stats]);

  const getActionClass = (value: string) => {
    if (value === "CREATE") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (value === "UPDATE") return "border-sky-200 bg-sky-50 text-sky-700";
    return "border-rose-200 bg-rose-50 text-rose-700";
  };

  const getUserLabel = (log: any) =>
    log.user?.name ||
    log.user?.username ||
    log.userName ||
    `Usuario #${log.userId || "sistema"}`;

  const safeJson = (value: any) => {
    if (!value) return "—";
    try {
      if (typeof value === "string") return JSON.stringify(JSON.parse(value), null, 2);
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Creaciones</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{actionTotals.create}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Actualizaciones</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{actionTotals.update}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Eliminaciones</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{actionTotals.delete}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Filtros de auditoria</h3>
              <p className="text-sm text-slate-500">Explora el historial de cambios por entidad, usuario o fecha.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Actualizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEntityType("");
                  setEntityId("");
                  setAction("all");
                  setUserId("all");
                  setStartDate("");
                  setEndDate("");
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-5">
            <Input
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              placeholder="Entidad (products, orders...)"
              className="h-11 rounded-2xl border-slate-200 bg-white"
            />
            <Input
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder="ID entidad"
              className="h-11 rounded-2xl border-slate-200 bg-white"
            />
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white">
                <SelectValue placeholder="Accion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="CREATE">CREATE</SelectItem>
                <SelectItem value="UPDATE">UPDATE</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white">
                <SelectValue placeholder="Usuario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {(users as any[]).map((user) => (
                  <SelectItem key={user.id} value={String(user.id)}>
                    {user.name || user.username || `#${user.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-11 rounded-2xl border-slate-200 bg-white"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-11 rounded-2xl border-slate-200 bg-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="overflow-hidden border-slate-200/80 shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex min-h-[260px] items-center justify-center text-sm text-slate-500">
                Cargando auditoria...
              </div>
            ) : (logs as any[]).length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 px-6 text-center">
                <FileText className="h-12 w-12 text-slate-300" />
                <h3 className="text-lg font-bold text-slate-800">Sin registros encontrados</h3>
                <p className="max-w-md text-sm text-slate-500">
                  Prueba ajustando los filtros para ubicar cambios específicos.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-slate-700">Fecha</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-700">Entidad</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-700">Accion</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-700">Usuario</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-700">Descripcion</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-700">Ver</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {(logs as any[]).map((log) => (
                      <tr key={log.id}>
                        <td className="px-4 py-4 text-slate-500">
                          {new Date(log.createdAt).toLocaleString("es-BO", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-900">{log.entityType}</p>
                            <p className="text-xs text-slate-500">ID {log.entityId}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant="outline" className={getActionClass(log.action)}>
                            {log.action}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-slate-700">{getUserLabel(log)}</td>
                        <td className="px-4 py-4 text-slate-600">{log.description || "Sin descripcion"}</td>
                        <td className="px-4 py-4 text-right">
                          <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => setSelectedLog(log)}>
                            Ver
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="p-5">
            <h3 className="text-base font-bold text-slate-900">Resumen rapido</h3>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Entidades destacadas</p>
                <div className="mt-2 space-y-1 text-sm text-slate-700">
                  {entityTotals.length > 0 ? (
                    entityTotals.map((row: any) => (
                      <div key={row.entityType} className="flex items-center justify-between">
                        <span className="font-semibold">{row.entityType}</span>
                        <span className="font-black">{row.count}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500">Sin datos</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Usuarios activos</p>
                <div className="mt-2 space-y-1 text-sm text-slate-700">
                  {userTotals.length > 0 ? (
                    userTotals.map((row: any) => (
                      <div key={String(row.userId)} className="flex items-center justify-between">
                        <span className="font-semibold">{row.userName || `#${row.userId}`}</span>
                        <span className="font-black">{row.count}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500">Sin datos</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={selectedLog !== null} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalle de auditoria</DialogTitle>
            <DialogDescription>Consulta los valores anteriores y nuevos del cambio registrado.</DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">Valores anteriores</p>
                <pre className="max-h-[340px] overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                  {safeJson(selectedLog.oldValues)}
                </pre>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">Valores nuevos</p>
                <pre className="max-h-[340px] overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                  {safeJson(selectedLog.newValues)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InventoryView() {
  const { data: productionInventory = [], isLoading: loadingInventory, refetch: refetchInventory } =
    trpc.production.getProductionInventory.useQuery(undefined, {
      retry: 2,
      refetchOnWindowFocus: true,
    });
  const { data: batches = [] } = trpc.production.getBatches.useQuery(undefined, {
    retry: 2,
    refetchOnWindowFocus: true,
  });
  const { data: movements = [] } = trpc.production.getKefirMovements.useQuery(undefined, {
    retry: 2,
    refetchOnWindowFocus: true,
  });
  const { data: inventory = [] } = trpc.inventory.listInventory.useQuery(undefined, {
    retry: 2,
    refetchOnWindowFocus: true,
  });

  const [searchTerm, setSearchTerm] = useState("");

  const minStockByProductId = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of inventory as any[]) {
      map.set(item.productId, normalizeNumber(item.minStock, 0));
    }
    return map;
  }, [inventory]);

  const productById = useMemo(() => {
    const map = new Map<number, any>();
    for (const item of inventory as any[]) {
      map.set(item.productId, item.product);
    }
    return map;
  }, [inventory]);

  const rows = useMemo<ProductionRow[]>(() => {
    return (productionInventory as any[]).map((item) => {
      const product = productById.get(item.productId);
      const minStock = minStockByProductId.get(item.productId) ?? 0;
      const quantity = normalizeNumber(item.quantity, 0);
      const estimatedValue = quantity * normalizeNumber(product?.price ?? product?.salePrice ?? 0, 0);

      return {
        id: item.id,
        productId: item.productId,
        quantity,
        productName: item.productName ?? product?.name ?? "Producto",
        productCode: item.productCode ?? product?.code ?? "",
        category: item.category ?? product?.category ?? "other",
        unit: item.unit ?? product?.unit ?? "unidad",
        minStock,
        estimatedValue,
        isLowStock: quantity <= minStock,
      };
    });
  }, [productionInventory, productById, minStockByProductId]);

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name-asc");
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  const categoryOptions = useMemo(() => {
    const values = Array.from(new Set(rows.map((row) => row.category).filter(Boolean) as string[]));
    return ["all", ...values.sort()];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const next = rows.filter((row) => {
      const matchesSearch =
        !term ||
        row.productName?.toLowerCase().includes(term) ||
        row.productCode?.toLowerCase().includes(term) ||
        getCategoryLabel(row.category).toLowerCase().includes(term);
      const matchesCategory = categoryFilter === "all" || row.category === categoryFilter;
      const matchesLowStock = !onlyLowStock || row.isLowStock;

      return matchesSearch && matchesCategory && matchesLowStock;
    });

    next.sort((a, b) => {
      switch (sortBy) {
        case "name-desc":
          return (b.productName || "").localeCompare(a.productName || "");
        case "stock-asc":
          return a.quantity - b.quantity;
        case "stock-desc":
          return b.quantity - a.quantity;
        case "value-asc":
          return (a.estimatedValue || 0) - (b.estimatedValue || 0);
        case "value-desc":
          return (b.estimatedValue || 0) - (a.estimatedValue || 0);
        case "low-stock":
          return Number(b.isLowStock) - Number(a.isLowStock) || (a.productName || "").localeCompare(b.productName || "");
        default:
          return (a.productName || "").localeCompare(b.productName || "");
      }
    });

    return next;
  }, [rows, searchTerm, categoryFilter, sortBy, onlyLowStock]);

  const activeBatches = (batches as any[]).filter((batch) => batch.status === "in_progress").length;
  const lowStockCount = rows.filter((row) => row.isLowStock).length;
  const totalValue = rows.reduce((sum, row) => sum + (row.estimatedValue || 0), 0);
  const totalQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Total ítems</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{rows.length}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/60 shadow-sm">
          <CardContent className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700">Stock bajo</p>
            <p className="mt-2 text-3xl font-black text-emerald-700">{lowStockCount}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Valor estimado</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{formatCurrencyBs(totalValue / 100)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr_1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre de ítem..."
                className="h-11 rounded-2xl border-slate-200 bg-white pl-10"
              />
            </div>

            <select
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">Todas las categorías</option>
              {categoryOptions
                .filter((option) => option !== "all")
                .map((option) => (
                  <option key={option} value={option}>
                    {getCategoryLabel(option)}
                  </option>
                ))}
            </select>

            <select
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="name-asc">Ordenar: A-Z</option>
              <option value="name-desc">Ordenar: Z-A</option>
              <option value="stock-desc">Stock: mayor a menor</option>
              <option value="stock-asc">Stock: menor a mayor</option>
              <option value="low-stock">Solo stock bajo</option>
              <option value="value-desc">Valor: mayor a menor</option>
            </select>

            <Button
              variant={onlyLowStock ? "default" : "outline"}
              className="h-11 rounded-2xl px-4"
              onClick={() => setOnlyLowStock((current) => !current)}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Solo Stock Bajo
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
            <p>{activeBatches} lotes activos</p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => refetchInventory()}>
                Actualizar
              </Button>
              <span>{filteredRows.length} de {rows.length} ítems</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-slate-200/80 shadow-sm">
        <CardContent className="p-0">
          {loadingInventory ? (
            <div className="flex min-h-[280px] items-center justify-center text-sm text-slate-500">
              Cargando inventario de producción...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 px-6 text-center">
              <Package2 className="h-12 w-12 text-slate-300" />
              <h3 className="text-lg font-bold text-slate-800">Sin ítems que coincidan con los filtros</h3>
              <p className="max-w-md text-sm text-slate-500">
                Prueba ajustando la búsqueda o desactivando los filtros activos.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">Ítem</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">Categoría</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">Unidad</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-700">Stock</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-700">Mín.</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-700">Valor</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-700">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRows.map((row) => {
                    const fill = row.minStock > 0 ? Math.min(100, Math.round((row.quantity / row.minStock) * 100)) : row.quantity > 0 ? 100 : 0;
                    return (
                      <tr key={String(row.id)} className={row.isLowStock ? "bg-rose-50/30" : ""}>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <p className="font-bold text-slate-900">{row.productName}</p>
                            <p className="text-xs text-slate-500">
                              {row.productCode || "Sin código"} · ID {row.productId}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant="outline" className={getCategoryBadgeClass(row.category)}>
                            {getCategoryLabel(row.category)}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-slate-700">{row.unit || "unidad"}</td>
                        <td className="px-4 py-4 text-right">
                          <div className="space-y-2">
                            <div className="font-black text-slate-900">{row.quantity}</div>
                            <div className="h-2 w-32 rounded-full bg-slate-100">
                              <div
                                className={`h-2 rounded-full ${row.isLowStock ? "bg-rose-500" : "bg-emerald-500"}`}
                                style={{ width: `${fill}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-slate-700">{row.minStock}</td>
                        <td className="px-4 py-4 text-right font-semibold text-slate-900">
                          {formatCurrencyBs((row.estimatedValue || 0) / 100)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Badge
                            variant="outline"
                            className={
                              row.isLowStock
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }
                          >
                            {row.isLowStock ? "Bajo" : "OK"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-slate-200/80 shadow-sm">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Movimientos recientes</h3>
                <p className="text-sm text-slate-500">Kárdex de planta con los últimos cambios sincronizados.</p>
              </div>
              <Badge variant="outline" className="bg-slate-50 text-slate-700">
                {movements.length} registros
              </Badge>
            </div>

            <div className="space-y-3">
              {(movements as any[]).slice(0, 5).map((movement) => (
                <div
                  key={movement.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{movement.productName}</p>
                    <p className="text-xs text-slate-500">{movement.reason || "Movimiento de planta"}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-black ${movement.changeAmount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {movement.changeAmount >= 0 ? "+" : ""}
                      {movement.changeAmount}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(movement.createdAt).toLocaleString("es-BO", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {(movements as any[]).length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                  Aún no hay movimientos registrados.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="p-5">
            <h3 className="text-base font-bold text-slate-900">Resumen rápido</h3>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Stock total</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{totalQuantity}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Lotes activos</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{activeBatches}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Ítems con alerta</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function KefirControlModulePage() {
  const [location] = useLocation();
  const section = getSectionFromPath(location);

  const sectionMeta = sections.find((item) => item.key === section) ?? sections.find((item) => item.key === "inventario")!;
  const headerTitle =
    section === "inventario"
      ? "Control de Inventario"
      : section === "lotes"
        ? "Lotes de Produccion"
        : sectionMeta.label;
  const headerSubtitle =
    section === "inventario"
      ? `${new Date().toLocaleDateString("es-BO", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })} · inventario sincronizado`
      : section === "lotes"
        ? "Gestion y cierre de lotes de planta"
      : section === "ordenes"
        ? "Seguimiento, cambios de estado y control de pedidos"
      : section === "auditoria"
        ? "Historial de cambios y trazabilidad del sistema"
      : section === "productos"
        ? "Catálogo interno y control de roles de producción"
        : "Submódulo pendiente de migración";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-500 text-white shadow-sm">
            <Droplets className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-black leading-none">KéfirControl</p>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Panel industrial</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {sections.map((item) => {
              const isActive = item.key === section;
              const Icon = item.icon;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-sky-500 text-white shadow-[0_10px_24px_-10px_rgba(14,165,233,0.7)]"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">{headerTitle}</h1>
            <p className="text-sm text-slate-500">{headerSubtitle}</p>
          </div>
        </header>

        <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sections.map((item) => {
              const isActive = item.key === section;
              const Icon = item.icon;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap ${
                    isActive ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <main className="px-4 py-6 sm:px-6">
          {section === "inventario" ? (
            <InventoryView />
          ) : section === "productos" ? (
            <ProductsView />
          ) : section === "lotes" ? (
            <BatchesView />
          ) : section === "ordenes" ? (
            <OrdersView />
          ) : section === "auditoria" ? (
            <AuditView />
          ) : (
            <SectionPlaceholder label={sectionMeta.label} />
          )}
        </main>
      </div>
    </div>
  );
}
