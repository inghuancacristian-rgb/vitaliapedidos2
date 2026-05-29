import {
  Loader2,
  Package,
  Droplets,
  Scale,
  Tag,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Box,
} from "lucide-react";
import { memo, useMemo } from "react";
import { Badge } from "@/components/ui/badge";

type ProductionInventoryItem = {
  id: number | string;
  productId?: number;
  productName: string;
  productCode?: string | null;
  category?: string | null;
  quantity: number | string;
  unit?: string | null;
  salePrice?: number | null;
  presentationQuantity?: number | null;
  presentationUnit?: string | null;
  presentationVolumeMl?: number | null;
  presentationWeightGr?: number | null;
  productionRole?: string | null;
  lastUpdated?: string | Date | null;
};

type ProductionInventoryTabProps = {
  inventoryWithStock: ProductionInventoryItem[];
  loadingInv: boolean;
};

function ProductionInventoryTab({
  inventoryWithStock,
  loadingInv,
}: ProductionInventoryTabProps) {
  // Compute summary stats
  const stats = useMemo(() => {
    const items = inventoryWithStock.filter(
      (i) => Number(i.quantity) > 0
    );
    const totalProducts = items.length;
    const totalUnits = items.reduce(
      (sum, i) => sum + Number(i.quantity),
      0
    );
    const totalValue = items.reduce((sum, i) => {
      const price = Number(i.salePrice || 0) / 100; // centavos a Bs
      return sum + price * Number(i.quantity);
    }, 0);
    const lowStockCount = items.filter(
      (i) => Number(i.quantity) > 0 && Number(i.quantity) <= 5
    ).length;
    return { totalProducts, totalUnits, totalValue, lowStockCount };
  }, [inventoryWithStock]);

  if (loadingInv) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const itemsWithStock = inventoryWithStock.filter(
    (i) => Number(i.quantity) > 0
  );

  if (itemsWithStock.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-4">
          <Package className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-700 mb-1">
          Almacén de Planta vacío
        </h3>
        <p className="text-sm text-slate-400 max-w-sm">
          No hay productos en el almacén de planta. Finalice un lote de
          producción para generar stock.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<Box className="h-4 w-4" />}
          label="Productos"
          value={String(stats.totalProducts)}
          color="blue"
        />
        <StatCard
          icon={<Package className="h-4 w-4" />}
          label="Unidades Total"
          value={String(stats.totalUnits)}
          color="emerald"
        />
        <StatCard
          icon={<Tag className="h-4 w-4" />}
          label="Valor Estimado"
          value={`Bs ${stats.totalValue.toFixed(2)}`}
          color="violet"
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Stock Bajo"
          value={String(stats.lowStockCount)}
          color={stats.lowStockCount > 0 ? "amber" : "emerald"}
        />
      </div>

      {/* Product Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
          gap: "14px",
        }}
      >
        {itemsWithStock.map((item) => (
          <ProductCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

export default memo(ProductionInventoryTab);

/* ─── Stat Card ───────────────────────────────────────── */
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; iconBg: string }> =
    {
      blue: {
        bg: "bg-blue-50",
        text: "text-blue-700",
        iconBg: "bg-blue-100",
      },
      emerald: {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        iconBg: "bg-emerald-100",
      },
      violet: {
        bg: "bg-violet-50",
        text: "text-violet-700",
        iconBg: "bg-violet-100",
      },
      amber: {
        bg: "bg-amber-50",
        text: "text-amber-700",
        iconBg: "bg-amber-100",
      },
    };

  const colors = colorMap[color] || colorMap.blue;

  return (
    <div
      className={`${colors.bg} rounded-xl p-3 flex items-center gap-3 border border-slate-100`}
    >
      <div
        className={`${colors.iconBg} ${colors.text} flex h-9 w-9 shrink-0 items-center justify-center rounded-lg`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 truncate">{label}</p>
        <p className={`text-sm font-bold ${colors.text} truncate`}>{value}</p>
      </div>
    </div>
  );
}

/* ─── Product Card ────────────────────────────────────── */
function ProductCard({ item }: { item: ProductionInventoryItem }) {
  const qty = Number(item.quantity);
  const salePrice = Number(item.salePrice || 0) / 100; // centavos a Bs
  const volMl = Number(item.presentationVolumeMl || 0);
  const weightGr = Number(item.presentationWeightGr || 0);

  // Stock level determination
  const stockLevel: "critical" | "low" | "good" | "high" =
    qty <= 2 ? "critical" : qty <= 5 ? "low" : qty <= 20 ? "good" : "high";

  const stockConfig = {
    critical: {
      barColor: "#dc2626", // red-600
      badgeClass: "bg-red-100 text-red-700 border-red-200",
      badgeLabel: "Crítico",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    low: {
      barColor: "#f59e0b", // amber-500
      badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
      badgeLabel: "Bajo",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    good: {
      barColor: "#10b981", // emerald-500
      badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
      badgeLabel: "Normal",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    high: {
      barColor: "#3b82f6", // blue-500
      badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
      badgeLabel: "Alto",
      icon: <TrendingUp className="h-3 w-3" />,
    },
  };

  const config = stockConfig[stockLevel];

  // Presentation label
  const presentationLabel = volMl > 0
    ? volMl >= 1000
      ? `${(volMl / 1000).toFixed(volMl % 1000 === 0 ? 0 : 1)}L`
      : `${volMl}ml`
    : weightGr > 0
      ? weightGr >= 1000
        ? `${(weightGr / 1000).toFixed(weightGr % 1000 === 0 ? 0 : 1)}kg`
        : `${weightGr}g`
      : null;

  // Category label
  const categoryLabel =
    item.category === "finished_product"
      ? "Producto Terminado"
      : item.category === "raw_material"
        ? "Materia Prima"
        : item.category === "supplies"
          ? "Suministro"
          : String(item.category ?? "").replace(/_/g, " ");

  // Last updated
  const lastUpdatedStr = item.lastUpdated
    ? formatRelativeDate(new Date(item.lastUpdated))
    : null;

  // Stock bar percentage (max at 50 for visual purposes)
  const barPercent = Math.min((qty / 50) * 100, 100);

  return (
    <div
      style={{
        border: `1px solid ${config.barColor}30`,
        background: `${config.barColor}04`,
        transition: "all 0.2s ease",
        position: "relative",
        overflow: "hidden",
        borderRadius: "14px",
      }}
      className="hover:shadow-md"
    >
      {/* Top color bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          background: config.barColor,
        }}
      />

      <div style={{ padding: "14px 16px", paddingTop: "18px" }}>
        {/* Header: Name + Badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <h4
              className="font-bold text-slate-900 leading-tight truncate"
              style={{ fontSize: "13.5px" }}
              title={item.productName}
            >
              {item.productName}
            </h4>
            {item.productCode && (
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                {item.productCode}
              </p>
            )}
          </div>
          <Badge
            variant="outline"
            className={`${config.badgeClass} shrink-0 text-[10px] gap-1 py-0.5 px-1.5 font-semibold`}
          >
            {config.icon}
            {config.badgeLabel}
          </Badge>
        </div>

        {/* Quantity Display */}
        <div className="mb-3">
          <div className="flex items-baseline gap-1.5 mb-1.5">
            <span
              className="font-extrabold text-slate-900"
              style={{ fontSize: "26px", lineHeight: 1 }}
            >
              {qty}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {item.unit || "unidades"}
            </span>
          </div>

          {/* Stock bar */}
          <div
            style={{
              height: "4px",
              borderRadius: "2px",
              background: "#e2e8f0",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${barPercent}%`,
                background: config.barColor,
                borderRadius: "2px",
                transition: "width 0.5s ease",
              }}
            />
          </div>
        </div>

        {/* Details Grid */}
        <div className="space-y-1.5">
          {/* Price */}
          {salePrice > 0 && (
            <DetailRow
              icon={<Tag className="h-3 w-3 text-violet-500" />}
              label="Precio Vta."
              value={`Bs ${salePrice.toFixed(2)}`}
              valueClass="text-violet-700 font-bold"
            />
          )}

          {/* Volume / Weight */}
          {presentationLabel && (
            <DetailRow
              icon={
                volMl > 0 ? (
                  <Droplets className="h-3 w-3 text-blue-500" />
                ) : (
                  <Scale className="h-3 w-3 text-orange-500" />
                )
              }
              label="Presentación"
              value={presentationLabel}
            />
          )}

          {/* Category */}
          {categoryLabel && (
            <DetailRow
              icon={<Box className="h-3 w-3 text-slate-400" />}
              label="Categoría"
              value={categoryLabel}
            />
          )}

          {/* Last Updated */}
          {lastUpdatedStr && (
            <DetailRow
              icon={<Clock className="h-3 w-3 text-slate-400" />}
              label="Actualizado"
              value={lastUpdatedStr}
            />
          )}
        </div>

        {/* Total value footer */}
        {salePrice > 0 && qty > 0 && (
          <div
            className="mt-3 pt-2 flex items-center justify-between"
            style={{
              borderTop: "1px dashed #e2e8f0",
            }}
          >
            <span className="text-[11px] text-slate-400">Valor Total</span>
            <span className="text-sm font-bold text-slate-700">
              Bs {(salePrice * qty).toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Detail Row ──────────────────────────────────────── */
function DetailRow({
  icon,
  label,
  value,
  valueClass = "text-slate-700",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[11px] text-slate-500">{label}</span>
      </div>
      <span className={`text-[12px] font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────── */
function formatRelativeDate(date: Date): string {
  try {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Ahora mismo";
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;

    return date.toLocaleDateString("es-BO", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "";
  }
}
