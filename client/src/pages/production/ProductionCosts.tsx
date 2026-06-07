import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProductionControl } from "@/lib/productionControl";
import { Coins, TrendingUp, Wallet } from "lucide-react";

export default function ProductionCosts() {
  const control = useProductionControl();
  const totalInventoryValue = control.inventory.reduce((sum, item) => sum + item.quantity * item.avgCost, 0);
  const completedBatches = control.batches.filter((batch) => batch.status === "finalizado");
  const consumedValue = control.movements
    .filter((movement) => movement.changeAmount < 0)
    .reduce((sum, movement) => {
      const item = control.inventory.find((entry) => entry.name === movement.productName);
      return sum + Math.abs(movement.changeAmount) * (item?.avgCost || 0);
    }, 0);
  const averageBatchCost = completedBatches.length > 0 ? consumedValue / completedBatches.length : 0;
  const finishedInventory = control.inventory.filter((item) => item.category === "terminado" || item.category === "subproducto");
  const estimatedSalesValue = finishedInventory.reduce((sum, item) => sum + item.quantity * Math.max(item.avgCost * 1.8, item.avgCost), 0);
  const margin = estimatedSalesValue > 0 ? Math.round(((estimatedSalesValue - totalInventoryValue) / estimatedSalesValue) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Analisis de Costos</h1>
        <p className="text-muted-foreground">Valor de planta, consumo por lotes y margen estimado de produccion.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Inventario Planta</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Bs. {totalInventoryValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Costo promedio por stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Promedio / Lote</CardTitle>
            <Coins className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Bs. {averageBatchCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Segun consumos registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margen Estimado</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.max(0, margin)}%</div>
            <p className="text-xs text-muted-foreground">Referencial por costo interno</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Valorizacion de inventario
            </CardTitle>
            <CardDescription>Costos promedio configurados en la capa de produccion.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {control.inventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell className="text-right">Bs. {item.avgCost.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold">Bs. {(item.quantity * item.avgCost).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lotes finalizados</CardTitle>
            <CardDescription>Vista rapida de volumen final y unidades obtenidas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {completedBatches.length > 0 ? (
              completedBatches.map((batch) => (
                <div key={batch.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">{batch.batchNumber}</p>
                      <p className="text-xs text-muted-foreground">{batch.operator} · {batch.endDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{batch.finalUnits} unid.</p>
                      <p className="text-xs text-muted-foreground">{batch.finalVolumeLiters || batch.finalQuesoGr || 0} salida</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-48 items-center justify-center text-muted-foreground">No hay lotes cerrados para costear.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
