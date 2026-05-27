import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AddProductDialog } from "@/components/AddProductDialog";
import { EditProductDialog } from "@/components/EditProductDialog";
import { formatCurrency } from "@/lib/currency";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Droplets,
  Factory,
  FileText,
  FlaskConical,
  Package2,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
  LineChart,
  Store,
  Tag,
  ShoppingCart,
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
  const headerTitle = section === "inventario" ? "Control de Inventario" : sectionMeta.label;
  const headerSubtitle =
    section === "inventario"
      ? `${new Date().toLocaleDateString("es-BO", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })} · inventario sincronizado`
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
          ) : (
            <SectionPlaceholder label={sectionMeta.label} />
          )}
        </main>
      </div>
    </div>
  );
}
