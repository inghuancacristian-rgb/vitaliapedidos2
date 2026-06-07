import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getOrderStatusLabel, getTypeLabel, useProductionControl } from "@/lib/productionControl";
import { FileText, Printer } from "lucide-react";

export default function ProductionReports() {
  const control = useProductionControl();
  const completedOrders = control.orders.filter((order) => order.status === "completada").length;
  const completedBatches = control.batches.filter((batch) => batch.status === "finalizado").length;
  const approvedQuality = control.batches.filter((batch) => batch.quality.status === "aprobado").length;
  const avgYield =
    control.yieldRecords.length > 0
      ? Math.round(control.yieldRecords.reduce((sum, record) => sum + record.yieldPct, 0) / control.yieldRecords.length)
      : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Reportes de Produccion</h1>
          <p className="text-muted-foreground">Resumen de ordenes, lotes, calidad, inventario critico y rendimiento.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ordenes completadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedOrders}</div>
            <p className="text-xs text-muted-foreground">De {control.orders.length} ordenes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Lotes cerrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedBatches}</div>
            <p className="text-xs text-muted-foreground">Produccion registrada</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Calidad aprobada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedQuality}</div>
            <p className="text-xs text-muted-foreground">Lotes liberados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rendimiento prom.</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgYield}%</div>
            <p className="text-xs text-muted-foreground">Lotes con cierre</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Ordenes de produccion
            </CardTitle>
            <CardDescription>Estado actual y avance por unidades.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Orden</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Avance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {control.orders.length > 0 ? (
                    control.orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-bold">{order.id}</TableCell>
                        <TableCell>{order.client}</TableCell>
                        <TableCell>{getOrderStatusLabel(order.status)}</TableCell>
                        <TableCell className="text-right">{order.progress}%</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        Sin ordenes registradas.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lotes por tipo</CardTitle>
            <CardDescription>Volumen inicial y salida final.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lote</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Entrada L</TableHead>
                    <TableHead className="text-right">Unid.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {control.batches.length > 0 ? (
                    control.batches.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-bold">{batch.batchNumber}</TableCell>
                        <TableCell>{getTypeLabel(batch.type)}</TableCell>
                        <TableCell className="text-right">{batch.initialVolumeLiters}</TableCell>
                        <TableCell className="text-right">{batch.finalUnits}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        Sin lotes registrados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventario critico</CardTitle>
          <CardDescription>Items bajo minimo para reposicion de planta.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {control.inventoryAlerts.length > 0 ? (
            control.inventoryAlerts.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-md border p-3">
                <span className="font-medium">{item.name}</span>
                <span className="text-sm text-muted-foreground">
                  {item.quantity} / {item.minStock} {item.unit}
                </span>
              </div>
            ))
          ) : (
            <div className="flex h-24 items-center justify-center text-muted-foreground">No hay alertas de stock.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
