import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowDown,
  ArrowUp,
  Ban,
  Clock3,
  Eye,
  PackagePlus,
  PencilLine,
  RotateCcw,
  ShoppingCart,
  Truck,
  User,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProductHistoryDialogProps {
  productId: number;
  productName: string;
}

function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getEventBadge(eventType: string) {
  switch (eventType) {
    case "created":
      return <Badge className="bg-blue-600 text-white hover:bg-blue-600">Creado</Badge>;
    case "purchase":
      return <Badge className="bg-sky-600 text-white hover:bg-sky-600">Compra</Badge>;
    case "sale":
      return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Venta</Badge>;
    case "sale_cancellation":
      return <Badge variant="secondary">Reposicion</Badge>;
    case "order_reservation":
      return <Badge className="bg-orange-500 text-white hover:bg-orange-500">Pedido</Badge>;
    case "order_cancellation":
      return <Badge variant="destructive">Pedido cancelado</Badge>;
    case "order_delivery":
      return <Badge className="bg-amber-500 text-white hover:bg-amber-500">Entregado</Badge>;
    case "deactivated":
      return <Badge variant="destructive">Baja</Badge>;
    case "reactivated":
      return <Badge className="bg-amber-500 text-white hover:bg-amber-500">Reactivado</Badge>;
    case "updated":
      return <Badge variant="outline">Actualizacion</Badge>;
    case "inventory_entry":
      return <Badge className="bg-cyan-600 text-white hover:bg-cyan-600">Entrada</Badge>;
    case "inventory_exit":
      return <Badge variant="secondary">Salida</Badge>;
    default:
      return <Badge variant="outline">Ajuste</Badge>;
  }
}

function getEventIcon(eventType: string) {
  switch (eventType) {
    case "created":
      return <PackagePlus className="h-4 w-4 text-blue-600" />;
    case "purchase":
      return <Truck className="h-4 w-4 text-sky-600" />;
    case "sale":
      return <ShoppingCart className="h-4 w-4 text-emerald-600" />;
    case "sale_cancellation":
      return <RotateCcw className="h-4 w-4 text-slate-600" />;
    case "order_reservation":
      return <Truck className="h-4 w-4 text-orange-500" />;
    case "order_cancellation":
      return <Ban className="h-4 w-4 text-red-600" />;
    case "order_delivery":
      return <Eye className="h-4 w-4 text-amber-600" />;
    case "deactivated":
      return <Ban className="h-4 w-4 text-red-600" />;
    case "reactivated":
      return <RotateCcw className="h-4 w-4 text-amber-600" />;
    case "updated":
      return <PencilLine className="h-4 w-4 text-slate-600" />;
    case "inventory_entry":
      return <ArrowUp className="h-4 w-4 text-cyan-600" />;
    case "inventory_exit":
      return <ArrowDown className="h-4 w-4 text-slate-600" />;
    default:
      return <Clock3 className="h-4 w-4 text-slate-600" />;
  }
}

function getQuantityLabel(event: any) {
  if (!event.quantity) {
    return "Sin cambio de cantidad";
  }

  if (event.eventType === "sale" || event.eventType === "inventory_exit") {
    return `-${event.quantity} unidades`;
  }

  if (
    event.eventType === "purchase" ||
    event.eventType === "sale_cancellation" ||
    event.eventType === "inventory_entry"
  ) {
    return `+${event.quantity} unidades`;
  }

  if (event.eventType === "order_reservation") {
    return `-${event.quantity} en pedido`;
  }

  if (event.eventType === "order_cancellation") {
    return `+${event.quantity} repuesto`;
  }

  if (event.eventType === "order_delivery") {
    return `${event.quantity} entregados`;
  }

  return `${event.quantity} unidades`;
}

export function ProductHistoryDialog({
  productId,
  productName,
}: ProductHistoryDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data, isLoading } = trpc.inventory.getProductHistory.useQuery(
    { productId },
    { enabled: isOpen }
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Eye className="h-4 w-4" />
          Historial
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] w-[95vw] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Seguimiento del producto</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Historial completo de {productName}.
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Cargando historial...
          </div>
        ) : !data ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No se pudo cargar el historial.
          </div>
        ) : (
          <div className="flex flex-col gap-3 overflow-hidden flex-1 min-h-0">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 shrink-0">
              <div className="rounded-lg border bg-muted/30 p-2 sm:p-3">
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Código</p>
                <p className="font-semibold text-sm sm:text-base leading-tight mt-0.5">{data.product.code}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-2 sm:p-3">
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Stock actual</p>
                <p className="font-semibold text-sm sm:text-base leading-tight mt-0.5">{data.stock?.quantity ?? 0} uds.</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-2 sm:p-3">
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Compradas</p>
                <p className="font-semibold text-sm sm:text-base leading-tight mt-0.5">{data.summary.totalPurchasedUnits}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-2 sm:p-3">
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Vendidas</p>
                <p className="font-semibold text-sm sm:text-base leading-tight mt-0.5">{data.summary.totalSoldUnits}</p>
              </div>
              <div className="col-span-2 sm:col-span-1 md:col-span-1 rounded-lg border bg-muted/30 p-2 sm:p-3">
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Estado</p>
                <p className="font-semibold text-sm sm:text-base leading-tight mt-0.5">
                  {data.summary.currentStatus === "inactive" ? "Dado de baja" : "Activo"}
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/20 p-3 shrink-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
                <span className="font-bold">{data.product.name}</span>
                <span className="text-muted-foreground">
                  Compra: {formatCurrency(data.product.price)}
                </span>
                <span className="text-muted-foreground">
                  Venta: {formatCurrency(data.product.salePrice)}
                </span>
                <span className="text-muted-foreground font-medium">
                  Eventos: {data.summary.totalEvents}
                </span>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-auto rounded-lg border bg-background">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur-sm z-10">
                  <TableRow>
                    <TableHead className="w-[120px] text-[10px] sm:text-xs uppercase font-bold">Fecha</TableHead>
                    <TableHead className="text-[10px] sm:text-xs uppercase font-bold">Concepto / Detalle</TableHead>
                    <TableHead className="text-right text-[10px] sm:text-xs uppercase font-bold text-emerald-600">Ent.</TableHead>
                    <TableHead className="text-right text-[10px] sm:text-xs uppercase font-bold text-red-600">Sal.</TableHead>
                    <TableHead className="text-right text-[10px] sm:text-xs uppercase font-bold bg-muted/20">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.timeline.map((event: any) => (
                    <TableRow key={event.id} className="group hover:bg-muted/5">
                      <TableCell className="py-2 align-top">
                        <p className="text-[10px] leading-tight text-muted-foreground">
                          {formatDateTime(event.createdAt).split(",")[0]}
                        </p>
                        <p className="text-[9px] text-muted-foreground opacity-70">
                          {formatDateTime(event.createdAt).split(",")[1]}
                        </p>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="shrink-0">{getEventIcon(event.eventType)}</span>
                            <span className="font-semibold text-xs sm:text-sm">{event.title}</span>
                            <span className="scale-75 origin-left">{getEventBadge(event.eventType)}</span>
                          </div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
                            {event.description}
                          </p>
                          
                          {(event.orderNumber || event.saleNumber || event.userName || event.deliveryPersonName) && (
                            <div className="flex flex-wrap gap-x-2 gap-y-1 pt-1 text-[9px] sm:text-[10px]">
                              {event.orderNumber && (
                                <span className="flex items-center gap-1 text-blue-600 font-medium bg-blue-50 px-1 py-0.5 rounded">
                                  #Ord: {event.orderNumber}
                                  {event.orderStatus && (
                                    <span className={`ml-0.5 px-1 rounded-full text-[8px] ${event.orderStatus === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                      {event.orderStatus === 'delivered' ? '✓' : '⏳'}
                                    </span>
                                  )}
                                </span>
                              )}
                              {event.saleNumber && (
                                <span className="flex items-center gap-1 text-emerald-600 font-medium bg-emerald-50 px-1 py-0.5 rounded">
                                  #Venta: {event.saleNumber}
                                </span>
                              )}
                              {event.userName && (
                                <span className="flex items-center gap-0.5 text-slate-500">
                                  <User className="h-2.5 w-2.5" />
                                  {event.userName.split(" ")[0]}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 text-right font-medium text-emerald-600 align-top">
                        {event.entry > 0 ? `+${event.entry}` : ""}
                      </TableCell>
                      <TableCell className="py-2 text-right font-medium text-red-600 align-top">
                        {event.exit > 0 ? `-${event.exit}` : ""}
                      </TableCell>
                      <TableCell className="py-2 text-right font-bold bg-muted/5 align-top">
                        {event.balance}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.timeline.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-10">
                  No hay movimientos registrados
                </p>
              )}
            </div>
            
            <div className="shrink-0 mt-2">
              <Button onClick={() => setIsOpen(false)} className="w-full">
                Cerrar historial
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
