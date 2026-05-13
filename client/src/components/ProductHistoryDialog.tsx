import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading } = trpc.inventory.getProductHistory.useQuery(
    { productId, startDate, endDate },
    { enabled: isOpen }
  );

  return (
      <DialogContent className="max-w-6xl h-[92vh] sm:h-[90vh] w-[98vw] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
        <DialogHeader className="shrink-0 p-5 pb-3 border-b bg-muted/5">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tight text-primary">Kardex de Inventario</DialogTitle>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="outline" className="font-mono text-xs bg-background/50 backdrop-blur-sm px-2.5 py-0.5 border-primary/20 text-primary">
                  {productName}
                </Badge>
                <span className="hidden sm:inline text-xs text-muted-foreground font-medium italic">
                  — Auditoría profesional de movimientos de stock
                </span>
              </div>
            </div>
          </div>
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
          <div className="flex flex-col gap-5 overflow-hidden flex-1 min-h-0 p-5 pt-2">
            {/* Filtros de Fecha - Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl border bg-gradient-to-br from-muted/50 to-background shadow-sm shrink-0">
              <div className="space-y-2">
                <Label htmlFor="start-date" className="text-xs uppercase font-black text-muted-foreground/80 flex items-center gap-2 px-1">
                  <Clock3 className="h-3.5 w-3.5 text-primary/60" /> Fecha de Inicio
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 text-sm rounded-xl border-muted-foreground/20 focus:ring-primary/20 bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date" className="text-xs uppercase font-black text-muted-foreground/80 flex items-center gap-2 px-1">
                  <Eye className="h-3.5 w-3.5 text-primary/60" /> Fecha de Fin
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-10 text-sm rounded-xl border-muted-foreground/20 focus:ring-primary/20 bg-background"
                  />
                  {(startDate || endDate) && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-10 px-4 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl border-red-100" 
                      onClick={() => { setStartDate(""); setEndDate(""); }}
                    >
                      Limpiar
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Dashboard de Resumen - Adaptable */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 shrink-0">
              <div className="rounded-2xl border bg-background p-4 shadow-sm hover:shadow-md transition-all group">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Código</p>
                <p className="font-mono font-black text-lg text-primary truncate group-hover:text-primary/80 transition-colors">{data.product.code}</p>
              </div>
              <div className="rounded-2xl border bg-primary/5 p-4 shadow-sm border-primary/20 group">
                <p className="text-[10px] text-primary/70 font-bold uppercase tracking-wider mb-1">Stock Físico</p>
                <p className="font-black text-2xl text-primary group-hover:scale-105 transition-transform origin-left">{data.stock?.quantity ?? 0}</p>
              </div>
              <div className="rounded-2xl border bg-sky-50 p-4 shadow-sm border-sky-100 group">
                <p className="text-[10px] text-sky-700 font-bold uppercase tracking-wider mb-1">Total Ingresos</p>
                <p className="font-black text-2xl text-sky-800 group-hover:scale-105 transition-transform origin-left">{data.summary.totalPurchasedUnits}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm group">
                <p className="text-[10px] text-emerald-700 font-black uppercase tracking-wider mb-1">Saldo Final</p>
                <p className="font-black text-2xl text-emerald-800 group-hover:scale-110 transition-transform origin-left">
                  {data.summary.finalBalance}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm group">
                <p className="text-[10px] text-slate-600 font-black uppercase tracking-wider mb-1">Saldo Inicial</p>
                <p className="font-black text-2xl text-slate-800 group-hover:scale-105 transition-transform origin-left">
                  {data.summary.initialBalance}
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

            <div className="flex-1 min-h-0 overflow-auto rounded-2xl border shadow-inner bg-background/50">
              <Table className="relative">
                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-md z-20 shadow-sm">
                  <TableRow className="hover:bg-transparent border-b-2">
                    <TableHead className="w-[120px] sm:w-[150px] text-xs uppercase font-black text-muted-foreground px-5 py-4">Fecha / Hora</TableHead>
                    <TableHead className="text-xs uppercase font-black text-muted-foreground px-4">Concepto / Movimiento</TableHead>
                    <TableHead className="text-right text-xs uppercase font-black text-emerald-700 bg-emerald-500/5 px-6">Entrada</TableHead>
                    <TableHead className="text-right text-xs uppercase font-black text-red-700 bg-red-500/5 px-6">Salida</TableHead>
                    <TableHead className="text-right text-xs uppercase font-black bg-muted/30 px-6 border-l">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.timeline.map((event: any) => (
                    <TableRow key={event.id} className="group hover:bg-muted/10 transition-colors border-b last:border-0">
                      <TableCell className="py-4 px-5 align-top whitespace-nowrap">
                        <p className="text-sm font-bold text-slate-800">
                          {formatDateTime(event.createdAt).split(",")[0]}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {formatDateTime(event.createdAt).split(",")[1]}
                        </p>
                      </TableCell>
                      <TableCell className="py-4 px-4 min-w-[250px]">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="shrink-0 p-1.5 rounded-lg bg-muted/50 group-hover:bg-background shadow-sm transition-all">
                              {getEventIcon(event.eventType)}
                            </span>
                            <span className="font-black text-sm sm:text-base tracking-tight text-slate-800">{event.title}</span>
                            <span className="scale-95 origin-left">{getEventBadge(event.eventType)}</span>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium">
                            {event.description}
                          </p>
                          
                          {(event.orderNumber || event.saleNumber || event.userName || event.deliveryPersonName) && (
                            <div className="flex flex-wrap gap-x-2.5 gap-y-1.5 pt-1.5">
                              {event.orderNumber && (
                                <span className="flex items-center gap-1.5 text-[11px] text-blue-700 font-black bg-blue-100/50 px-2.5 py-1 rounded-lg border border-blue-200">
                                  #PEDIDO: {event.orderNumber}
                                  {event.orderStatus && (
                                    <span className={`ml-1 font-black ${event.orderStatus === 'delivered' ? 'text-green-600' : 'text-orange-600'}`}>
                                      {event.orderStatus === 'delivered' ? '✓' : '⧗'}
                                    </span>
                                  )}
                                </span>
                              )}
                              {event.saleNumber && (
                                <span className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-black bg-emerald-100/50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                  #VENTA: {event.saleNumber}
                                </span>
                              )}
                              {event.userName && (
                                <span className="flex items-center gap-1.5 text-[11px] text-slate-600 font-bold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                  <User className="h-3 w-3" />
                                  {event.userName.split(" ")[0]}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6 text-right font-black text-base text-emerald-700 bg-emerald-500/5 align-top">
                        {event.entry > 0 ? `+${event.entry}` : ""}
                      </TableCell>
                      <TableCell className="py-4 px-6 text-right font-black text-base text-red-700 bg-red-500/5 align-top">
                        {event.exit > 0 ? `-${event.exit}` : ""}
                      </TableCell>
                      <TableCell className="py-4 px-6 text-right font-black text-lg bg-muted/30 border-l align-top text-slate-900">
                        {event.balance}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.timeline.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 opacity-40">
                  <Clock3 className="h-12 w-12 mb-2" />
                  <p className="text-sm font-bold uppercase tracking-widest">Sin movimientos</p>
                </div>
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
