import {
  BadgeCheck,
  Boxes,
  FileText,
  FlaskConical,
  Layers3,
  Package,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  PRODUCTION_QUERY_OPTIONS,
  formatProductionDate,
  getActiveProductionBatches,
  getCompletedProductionBatches,
  getInventoryWithStock,
  getKefirHomeBatchTypeLabel,
} from "@/lib/production";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import KefirControlLayout from "@/pages/kefir-control/_shared/KefirControlLayout";

export default function KefirControlHomePage() {
  const { data: batches = [], isLoading: loadingBatches } =
    trpc.production.getBatches.useQuery(undefined, PRODUCTION_QUERY_OPTIONS);
  const { data: productionInventory = [], isLoading: loadingInventory } =
    trpc.production.getProductionInventory.useQuery(
      undefined,
      PRODUCTION_QUERY_OPTIONS
    );
  const { data: movements = [], isLoading: loadingMovements } =
    trpc.production.getKefirMovements.useQuery(
      undefined,
      PRODUCTION_QUERY_OPTIONS
    );

  const activeBatches = useMemo(
    () => getActiveProductionBatches(batches),
    [batches]
  );
  const completedBatches = useMemo(
    () => getCompletedProductionBatches(batches),
    [batches]
  );
  const inventoryWithStock = useMemo(
    () => getInventoryWithStock(productionInventory),
    [productionInventory]
  );

  const safeFormat = formatProductionDate;

  return (
    <KefirControlLayout
      title="KéfirControl"
      subtitle={`${new Date().toISOString().slice(0, 10)} • ${activeBatches.length} lotes activos`}
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Lotes activos"
              value={activeBatches.length}
              icon={Layers3}
            />
            <MetricCard
              label="Stock en planta"
              value={inventoryWithStock.length}
              icon={Boxes}
            />
            <MetricCard
              label="Movimientos"
              value={movements.length}
              icon={FileText}
            />
            <MetricCard
              label="Finalizados"
              value={completedBatches.length}
              icon={BadgeCheck}
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Lotes en curso
                </h2>
                <p className="text-sm text-slate-500">
                  Acceso rápido a la operación de planta
                </p>
              </div>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/kefir-control/lotes">Ver lotes</Link>
              </Button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Lote</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Inicio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingBatches ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : activeBatches.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-14 text-center text-slate-500"
                      >
                        No hay lotes en curso
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeBatches.slice(0, 6).map((batch: any) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-semibold">
                          {batch.batchNumber}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {getKefirHomeBatchTypeLabel(batch.type)}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                            En Progreso
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {safeFormat(
                            batch.startDate || batch.createdAt,
                            "dd/MM/yyyy HH:mm"
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">Inventario</h3>
              <FlaskConical className="h-4 w-4 text-slate-400" />
            </div>
            <div className="space-y-3">
              <div className="rounded-2xl bg-sky-50 p-4">
                <p className="text-sm text-sky-700">Stock óptimo</p>
                <p className="mt-1 text-2xl font-black text-sky-950">
                  {inventoryWithStock.length}
                </p>
              </div>
              <Button asChild className="w-full rounded-full">
                <Link href="/kefir-control/inventory">Gestionar Stock</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-emerald-950 to-slate-900 p-5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">
                  Nódulos
                </p>
                <h3 className="mt-2 text-3xl font-black">0 Cepas</h3>
              </div>
              <Package className="h-10 w-10 text-emerald-300/80" />
            </div>
            <p className="mt-4 max-w-[18rem] text-sm text-emerald-100/80">
              Vista preparada para separar nódulos, reportes y control de
              rendimiento en submódulos propios.
            </p>
            <Button
              className="mt-5 w-full rounded-full bg-indigo-600 text-white hover:bg-indigo-500"
              asChild
            >
              <Link href="/kefir-control/kardex">Ver Kárdex</Link>
            </Button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">Atajos</h3>
            <div className="mt-4 grid gap-2">
              <QuickLink
                href="/kefir-control/inventory"
                label="Inventario de Producción"
              />
              <QuickLink
                href="/kefir-control/kardex"
                label="Kárdex de Planta"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Movimientos recientes
              </h3>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/kefir-control/kardex">Ver todo</Link>
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              {loadingMovements ? (
                <p className="text-sm text-slate-500">
                  Cargando movimientos...
                </p>
              ) : movements.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Sin movimientos registrados.
                </p>
              ) : (
                movements.slice(0, 4).map((mov: any) => (
                  <div
                    key={mov.id}
                    className="rounded-2xl border border-slate-100 p-3"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {mov.productName}
                    </p>
                    <p className="text-xs text-slate-500">{mov.reason}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </KefirControlLayout>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <p className="mt-3 text-4xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Button
      variant="outline"
      className="justify-start rounded-2xl border-slate-200"
      asChild
    >
      <Link href={href}>{label}</Link>
    </Button>
  );
}
