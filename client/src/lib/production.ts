import { format } from "date-fns";
import { es } from "date-fns/locale";

export const PRODUCTION_QUERY_OPTIONS = {
  retry: 2,
  refetchOnWindowFocus: true,
} as const;

export const PRODUCT_LIST_QUERY_OPTIONS = {
  retry: 2,
} as const;

export type ProductionBatch = {
  status?: string | null;
};

export type ProductionProduct = {
  category?: string | null;
};

export type ProductionInventoryItem = {
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

export type QuantityDraft = {
  productId: number;
  quantity: string;
};

export type QuantityItem = {
  productId: number;
  quantity: number;
};

const PRODUCTION_BATCH_TYPE_LABELS = {
  kefir_production: "Elaboraci\u00f3n de K\u00e9fir",
  nodule_washing: "Lavado de N\u00f3dulos",
  maintenance: "Mantenimiento",
} as const;

export function formatProductionDate(dateVal: unknown, fmt: string) {
  try {
    const date = new Date(dateVal as string | number | Date);
    if (Number.isNaN(date.getTime())) return "\u2014";
    return format(date, fmt, { locale: es });
  } catch {
    return "\u2014";
  }
}

export function getProductionBatchTypeLabel(type: unknown) {
  if (typeof type !== "string") return PRODUCTION_BATCH_TYPE_LABELS.maintenance;
  return (
    PRODUCTION_BATCH_TYPE_LABELS[
      type as keyof typeof PRODUCTION_BATCH_TYPE_LABELS
    ] ?? PRODUCTION_BATCH_TYPE_LABELS.maintenance
  );
}

export function getKefirHomeBatchTypeLabel(type: unknown) {
  return type === "kefir_production"
    ? PRODUCTION_BATCH_TYPE_LABELS.kefir_production
    : String(type ?? "");
}

export function getActiveProductionBatches<T extends ProductionBatch>(
  batches: T[] = []
) {
  return batches.filter(batch => batch.status === "in_progress");
}

export function getCompletedProductionBatches<T extends ProductionBatch>(
  batches: T[] = []
) {
  return batches.filter(batch => batch.status === "completed");
}

export function getInventoryWithStock<T extends ProductionInventoryItem>(
  inventory: T[] = []
) {
  return inventory.filter(item => Number(item.quantity) > 0);
}

export function getFinishedProducts<T extends ProductionProduct>(
  products: T[] = []
) {
  return products.filter(product => product.category === "finished_product");
}

export function getProductionRawMaterials<T extends ProductionProduct>(
  products: T[] = []
) {
  return products.filter(
    product =>
      product.category === "raw_material" || product.category === "supplies"
  );
}

export function toPositiveQuantityItems(
  items: QuantityDraft[]
): QuantityItem[] {
  return items
    .filter(item => item.productId > 0 && Number(item.quantity) > 0)
    .map(item => ({
      productId: item.productId,
      quantity: Number(item.quantity),
    }));
}

export function toTransferQuantityItems(
  items: Record<number, string>
): QuantityItem[] {
  return Object.entries(items)
    .map(([id, quantity]) => ({
      productId: Number(id),
      quantity: Number(quantity),
    }))
    .filter(item => item.quantity > 0);
}
