import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { Wallet, QrCode, Landmark, Receipt, AlertCircle, CheckCircle2, Truck, PackageCheck, BadgeCheck, Lock, ShieldAlert, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function paymentMethodLabel(method?: string) {
  if (!method) return "—";
  if (method === "cash") return "Efectivo";
  if (method === "qr") return "QR";
  if (method === "transfer") return "Transferencia";
  return method;
}

export default function RepartidorFinance() {
  const getLocalDateInputValue = () => {
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60 * 1000;
    return new Date(now.getTime() - offsetMs).toISOString().split("T")[0];
  };

  const today = getLocalDateInputValue();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<any>({
    initialCash: "",
    reportedCash: "",
    reportedQr: "",
    reportedTransfer: "",
    expenses: "",
  });

  const { data: anyPending } = trpc.finance.hasPendingClosure.useQuery();
  const { data: status, refetch: refetchStatus } = trpc.finance.getMyStatus.useQuery({ date: today });
  const { data: pendingOrders } = trpc.finance.getPendingOrders.useQuery({});
  const { data: expected, isLoading: isLoadingExpected } = trpc.finance.getExpectedDaily.useQuery({ date: today });
  const { data: deliveryHistory } = trpc.finance.getDeliveryHistory.useQuery({ date: today });
  const { data: myClosures, isLoading: isLoadingClosures } = trpc.finance.listMyClosures.useQuery();
  const { data: activeOpeningData, isLoading: isLoadingOpening } = trpc.finance.hasActiveOpening.useQuery();

  const submitMutation = trpc.finance.submitClosure.useMutation({
    onSuccess: () => {
      toast.success("Cierre de caja enviado correctamente.");
      refetchStatus();
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status?.status === "pending") return;

    if (totalReported === 0 && !confirm("¿Seguro que deseas enviar el cierre con Bs. 0.00 recaudados?")) {
      return;
    }

    setIsSubmitting(true);
    try {
      await submitMutation.mutateAsync({
        date: today,
        initialCash: Math.round((parseFloat(formData.initialCash) || 0) * 100),
        reportedCash: Math.round((parseFloat(formData.reportedCash) || 0) * 100),
        reportedQr: Math.round((parseFloat(formData.reportedQr) || 0) * 100),
        reportedTransfer: Math.round((parseFloat(formData.reportedTransfer) || 0) * 100),
        expenses: Math.round((parseFloat(formData.expenses) || 0) * 100),
        expectedCash: expected?.cash || 0,
        expectedQr: expected?.qr || 0,
        expectedTransfer: expected?.transfer || 0,
        pendingOrders: pendingOrders?.total || 0,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLockedByPending = anyPending?.hasPending;
  const currentStatus = anyPending?.pendingClosure || status;

  if (isLockedByPending) {
    const displayStatus = currentStatus;
    const displayDate = displayStatus?.date || today;
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6 mb-10 min-h-screen">
        <Card className="border-t-4 border-t-blue-500 shadow-xl overflow-hidden">
          <CardHeader className="text-center pb-2 bg-slate-50/50">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
              <Receipt className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-black text-slate-800">Cierre en Revisión</CardTitle>
            <CardDescription className="text-slate-500 font-medium">
              Tu reporte del día {displayDate} ha sido enviado al administrador.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex justify-between items-center px-4 py-3 bg-white border border-slate-100 rounded-xl shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Estado Actual</span>
              <Badge className="bg-blue-600 hover:bg-blue-700 font-bold px-3 py-1">
                PENDIENTE DE APROBACIÓN
              </Badge>
            </div>

            {status?.pendingOrders != null && status.pendingOrders > 0 && (
              <div className="p-4 bg-orange-50 rounded-xl border-2 border-orange-200">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-100 rounded-full">
                    <Truck className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-orange-700 uppercase tracking-wider">Monto Pendiente de Entregas</p>
                    <p className="text-2xl font-black text-orange-800">{formatCurrency(displayStatus?.pendingOrders || 0)}</p>
                    <p className="text-[10px] text-orange-500 italic">Pedidos asignados y sin entregar</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-slate-50/50 border-none shadow-none">
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Efectivo Enviado</p>
                  <p className="text-2xl font-black text-slate-700">{formatCurrency(displayStatus?.reportedCash || 0)}</p>
                </CardContent>
              </Card>
              <Card className="bg-slate-50/50 border-none shadow-none">
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] text-slate-400 font-black uppercase mb-1">QR Enviado</p>
                  <p className="text-2xl font-black text-slate-700">{formatCurrency(displayStatus?.reportedQr || 0)}</p>
                </CardContent>
              </Card>
              <Card className="bg-slate-50/50 border-none shadow-none">
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Transf. Enviada</p>
                  <p className="text-2xl font-black text-slate-700">{formatCurrency(displayStatus?.reportedTransfer || 0)}</p>
                </CardContent>
              </Card>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3 items-start">
               <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
               <p className="text-xs text-blue-800 leading-relaxed font-medium">
                 Mientras el administrador revisa este arqueo, no podrás enviar nuevos reportes.
                 Una vez aprobado, el administrador abrirá tu nueva caja automáticamente.
               </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isBoxOpen = activeOpeningData?.hasActive;

  if (!isBoxOpen && !isLoadingOpening) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6 mb-10 min-h-screen">
        <Card className="border-t-4 border-t-slate-400 shadow-xl overflow-hidden">
          <CardHeader className="text-center pb-2 bg-slate-50/50">
            <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
              <Lock className="w-8 h-8 text-slate-600" />
            </div>
            <CardTitle className="text-2xl font-black text-slate-800">Caja Cerrada</CardTitle>
            <CardDescription className="text-slate-500 font-medium">
              Tu caja no ha sido aperturada para hoy {today}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6 text-center">
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 items-start text-left">
               <ShieldAlert className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
               <p className="text-xs text-amber-800 leading-relaxed font-medium">
                 Para iniciar tu turno y registrar ventas o entregas, el administrador debe realizar la <strong>Apertura de Caja</strong> asignándote como responsable.
               </p>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full py-6 border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
              onClick={() => window.location.reload()}
            >
              <History className="w-4 h-4 mr-2" /> Verificar Estado Nuevamente
            </Button>
          </CardContent>
        </Card>

        <ClosuresList myClosures={myClosures} isLoading={isLoadingClosures} />
      </div>
    );
  }

  const totalReported = (parseFloat(formData.reportedCash) || 0) + 
                       (parseFloat(formData.reportedQr) || 0) + 
                       (parseFloat(formData.reportedTransfer) || 0);
  const expectedCashBs = (expected?.cash || 0) / 100;
  const expectedQrBs = (expected?.qr || 0) / 100;
  const expectedTransferBs = (expected?.transfer || 0) / 100;
  const totalExpectedBs = expectedCashBs + expectedQrBs + expectedTransferBs;
  const diffCents = (totalReported * 100) - (Math.abs(expected?.cash || 0) + Math.abs(expected?.qr || 0) + Math.abs(expected?.transfer || 0));

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 mb-20 md:mb-10 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Cierre de Caja</h1>
          <p className="text-slate-500 font-medium">{today}</p>
        </div>
        <Badge
          className={
            status?.status === "approved"
              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
              : status?.status === "rejected"
                ? "bg-red-100 text-red-700 border-red-200"
                : "bg-blue-100 text-blue-700 border-blue-200"
          }
          variant="outline"
        >
          {status?.status === "approved" ? "Último cierre aprobado" : status?.status === "rejected" ? "Último cierre rechazado" : "Turno Activo"}
        </Badge>
      </div>

      {status && status.status !== "pending" ? (
        <Card className="border-none shadow-sm bg-slate-50/80 rounded-[1.5rem]">
          <CardContent className="p-4 flex items-center gap-3">
             <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-slate-400">
                <History className="h-4 w-4" />
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumen Anterior</p>
                <p className="text-xs font-bold text-slate-600">
                  Cierre #{status.id} · {status.status === "approved" ? "Aprobado" : "Rechazado"}
                  {status.adminNotes ? ` · Nota: ${status.adminNotes}` : ""}
                </p>
             </div>
          </CardContent>
        </Card>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 gap-4">
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-none shadow-xl shadow-orange-100 rounded-[2rem] overflow-hidden group">
            <CardContent className="p-6 relative">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <Truck className="w-32 h-32" />
              </div>
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
                  <Truck className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-orange-100 text-[10px] font-black uppercase tracking-widest">Pendiente de Entrega</p>
                  <p className="text-3xl font-black mt-1 tracking-tighter">
                    {pendingOrders ? formatCurrency(pendingOrders.total) : "..."}
                  </p>
                  <p className="text-xs text-orange-200 font-medium">
                    {pendingOrders ? `${pendingOrders.count} pedidos activos en ruta` : "Cargando..."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 text-white border-none shadow-xl shadow-slate-100 rounded-[2rem] overflow-hidden group">
            <CardContent className="p-6 relative">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <Wallet className="w-32 h-32" />
              </div>
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md">
                  <Wallet className="w-8 h-8 text-blue-300" />
                </div>
                <div className="flex-1">
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Fondo Inicial Asignado</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-3xl font-black tracking-tighter">Bs.</span>
                    <Input
                      type="number"
                      step="any"
                      onFocus={(e) => e.target.select()}
                      className="bg-transparent border-none text-3xl font-black p-0 h-auto focus-visible:ring-0 w-full tracking-tighter placeholder:text-slate-700"
                      placeholder="0.00"
                      value={formData.initialCash}
                      onChange={(e) => setFormData({...formData, initialCash: e.target.value})}
                    />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Dinero recibido para cambio</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-2">Arqueo de Recaudación</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-none shadow-sm bg-white rounded-[1.5rem] p-4 transition-all hover:shadow-md border border-slate-50">
                <Label className="flex items-center gap-2 text-emerald-600 font-black uppercase text-[10px] tracking-widest mb-3">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" /> Efectivo
                </Label>
                <div className="relative">
                   <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-300 font-black">Bs.</span>
                   <Input
                    type="number"
                    step="any"
                    onFocus={(e) => e.target.select()}
                    placeholder="0.00"
                    className="border-none shadow-none text-2xl font-black pl-8 h-10 focus-visible:ring-0 tracking-tighter"
                    value={formData.reportedCash}
                    onChange={(e) => setFormData({...formData, reportedCash: e.target.value})}
                  />
                </div>
              </Card>

              <Card className="border-none shadow-sm bg-white rounded-[1.5rem] p-4 transition-all hover:shadow-md border border-slate-50">
                <Label className="flex items-center gap-2 text-blue-600 font-black uppercase text-[10px] tracking-widest mb-3">
                  <div className="h-2 w-2 rounded-full bg-blue-500" /> Cobros QR
                </Label>
                <div className="relative">
                   <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-300 font-black">Bs.</span>
                   <Input
                    type="number"
                    step="any"
                    onFocus={(e) => e.target.select()}
                    placeholder="0.00"
                    className="border-none shadow-none text-2xl font-black pl-8 h-10 focus-visible:ring-0 tracking-tighter"
                    value={formData.reportedQr}
                    onChange={(e) => setFormData({...formData, reportedQr: e.target.value})}
                  />
                </div>
              </Card>

              <Card className="border-none shadow-sm bg-white rounded-[1.5rem] p-4 transition-all hover:shadow-md border border-slate-50">
                <Label className="flex items-center gap-2 text-purple-600 font-black uppercase text-[10px] tracking-widest mb-3">
                  <div className="h-2 w-2 rounded-full bg-purple-500" /> Transf.
                </Label>
                <div className="relative">
                   <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-300 font-black">Bs.</span>
                   <Input
                    type="number"
                    step="any"
                    onFocus={(e) => e.target.select()}
                    placeholder="0.00"
                    className="border-none shadow-none text-2xl font-black pl-8 h-10 focus-visible:ring-0 tracking-tighter"
                    value={formData.reportedTransfer}
                    onChange={(e) => setFormData({...formData, reportedTransfer: e.target.value})}
                  />
                </div>
              </Card>
           </div>
        </div>

        <Card className="border-none shadow-sm bg-orange-50/50 rounded-[1.5rem] p-4 border border-orange-100">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm text-orange-600 shrink-0">
                 <Receipt className="h-5 w-5" />
              </div>
              <div className="flex-1">
                 <Label className="text-[10px] font-black text-orange-700 uppercase tracking-widest">Gastos realizados (Gasolina, Viáticos, etc.)</Label>
                 <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-black text-orange-300">Bs.</span>
                    <Input
                      type="number"
                      step="any"
                      onFocus={(e) => e.target.select()}
                      placeholder="0.00"
                      className="border-none bg-transparent shadow-none p-0 h-auto text-xl font-black focus-visible:ring-0 text-orange-900 placeholder:text-orange-200"
                      value={formData.expenses}
                      onChange={(e) => setFormData({...formData, expenses: e.target.value})}
                    />
                 </div>
              </div>
           </div>
        </Card>

        <Card className="overflow-hidden border-none shadow-xl shadow-slate-100 rounded-[2.5rem] bg-white">
          <CardHeader className="bg-slate-50/50 py-6 px-8 border-b border-slate-50">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                   Resultados vs Sistema
                </CardTitle>
                <CardDescription className="text-xs font-medium">Comparación entre tu arqueo y los registros de la App.</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl font-bold text-xs h-10 px-4 bg-white shadow-sm border-slate-200 hover:bg-slate-50"
                disabled={!expected}
                onClick={() =>
                  setFormData((prev: any) => ({
                    ...prev,
                    reportedCash: expectedCashBs.toFixed(2),
                    reportedQr: expectedQrBs.toFixed(2),
                    reportedTransfer: expectedTransferBs.toFixed(2),
                  }))
                }
              >
                Auto-completar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
               <table className="w-full">
                 <thead>
                   <tr className="border-b border-slate-50">
                     <th className="text-left px-8 py-4 font-black text-slate-400 uppercase text-[9px] tracking-widest">Concepto</th>
                     <th className="text-right px-8 py-4 font-black text-slate-400 uppercase text-[9px] tracking-widest">Sugerido</th>
                     <th className="text-right px-8 py-4 font-black text-slate-400 uppercase text-[9px] tracking-widest">Tu Reporte</th>
                   </tr>
                 </thead>
                  <tbody className="divide-y divide-slate-50">
                    <tr className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-8 py-4 font-bold text-slate-700 text-sm">Efectivo</td>
                      <td className="px-8 py-4 text-right font-mono text-slate-400 text-xs">Bs. {expectedCashBs.toFixed(2)}</td>
                      <td className="px-8 py-4 text-right font-black text-slate-900 font-mono">Bs. {(parseFloat(formData.reportedCash) || 0).toFixed(2)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-8 py-4 font-bold text-blue-700 text-sm">Cobros por QR</td>
                      <td className="px-8 py-4 text-right font-mono text-slate-400 text-xs">Bs. {expectedQrBs.toFixed(2)}</td>
                      <td className="px-8 py-4 text-right font-black text-blue-700 font-mono">Bs. {(parseFloat(formData.reportedQr) || 0).toFixed(2)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-8 py-4 font-bold text-purple-700 text-sm">Transferencias</td>
                      <td className="px-8 py-4 text-right font-mono text-slate-400 text-xs">Bs. {expectedTransferBs.toFixed(2)}</td>
                      <td className="px-8 py-4 text-right font-black text-purple-700 font-mono">Bs. {(parseFloat(formData.reportedTransfer) || 0).toFixed(2)}</td>
                    </tr>
                    <tr className="bg-slate-900 text-white">
                      <td className="px-8 py-5 font-black uppercase text-[10px] tracking-widest">TOTAL RECAUDADO</td>
                      <td className="px-8 py-5 text-right font-black font-mono text-slate-400">Bs. {totalExpectedBs.toFixed(2)}</td>
                      <td className="px-8 py-5 text-right font-black font-mono text-emerald-400 text-xl tracking-tighter">Bs. {totalReported.toFixed(2)}</td>
                    </tr>
                  </tbody>
               </table>
            </div>
          </CardContent>
          <div className={`p-4 text-center text-xs font-black tracking-widest uppercase transition-colors duration-500 ${diffCents === 0 && totalExpectedBs > 0 ? 'bg-emerald-500 text-white' : diffCents > 0 ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'}`}>
            {diffCents === 0 && totalExpectedBs > 0 ? (
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> CUADRE PERFECTO
              </div>
            ) :
             diffCents > 0 ? `SOBRANTE DE Bs. ${(diffCents / 100).toFixed(2)}` :
             diffCents < 0 ? `FALTANTE DE Bs. ${(Math.abs(diffCents) / 100).toFixed(2)}` :
             totalExpectedBs > 0 ? "Completá los montos reportados" : "Sin entregas pendientes de cuadre"}
          </div>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-100 rounded-[2.5rem] bg-white overflow-hidden">
          <CardHeader className="py-6 px-8 border-b border-slate-50">
            <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                <PackageCheck className="w-5 h-5" />
              </div>
              Tus Entregas de Hoy
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-80 overflow-y-auto">
            {!deliveryHistory || deliveryHistory.length === 0 ? (
              <div className="p-10 text-center bg-slate-50/30">
                <Truck className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No hay entregas registradas hoy</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {deliveryHistory.map(({ order }: any) => (
                  <div key={order.id} className="flex items-center gap-4 px-8 py-4 hover:bg-slate-50 transition-colors group">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600 group-hover:scale-110 transition-transform">
                      <BadgeCheck className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-800 text-sm truncate uppercase tracking-tight">{order.orderNumber}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                         {paymentMethodLabel(order.paymentMethod)} · {new Date(order.deliveredAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                    <p className="font-black text-base text-emerald-600 tracking-tighter">{formatCurrency(order.totalPrice)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full h-16 text-xl font-black uppercase tracking-widest shadow-2xl shadow-emerald-200 bg-emerald-600 hover:bg-emerald-700 rounded-[2rem] transition-all hover:scale-[1.02] active:scale-[0.98]"
          disabled={isSubmitting || isLoadingExpected}
        >
          {isSubmitting ? "Procesando..." : "Enviar Cierre de Caja"}
        </Button>

        <div className="flex items-center justify-center gap-2 p-4 bg-blue-50 rounded-2xl border border-blue-100">
           <AlertCircle className="h-4 w-4 text-blue-500" />
           <p className="text-[10px] text-center text-blue-700 font-bold uppercase tracking-wider">
              Tu reporte será enviado al administrador para su validación oficial.
           </p>
        </div>
      </form>

      <ClosuresList myClosures={myClosures} isLoading={isLoadingClosures} />
    </div>
  );
}

function ClosuresList({ myClosures, isLoading }: { myClosures: any[] | undefined; isLoading: boolean }) {
  const closures = (myClosures || []).slice(0, 10);

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-bold">Historial de Cierres</CardTitle>
        <CardDescription className="text-xs">Tus últimos cierres enviados y su estado.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : closures.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground italic">Todavía no tienes cierres registrados.</div>
        ) : (
          <div className="divide-y">
            {closures.map((closure: any) => {
              const totalExpected = (closure.expectedCash || 0) + (closure.expectedQr || 0) + (closure.expectedTransfer || 0);
              const totalReported = (closure.reportedCash || 0) + (closure.reportedQr || 0) + (closure.reportedTransfer || 0);
              const diff = totalReported - totalExpected;
              const statusLabel =
                closure.status === "approved" ? "Aprobado" : closure.status === "rejected" ? "Rechazado" : "Pendiente";
              const statusClass =
                closure.status === "approved"
                  ? "bg-emerald-600"
                  : closure.status === "rejected"
                    ? "bg-red-600"
                    : "bg-blue-600";

              return (
                <div key={closure.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">Cierre #{closure.id} — {closure.date}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Esperado: {formatCurrency(totalExpected)} · Reportado: {formatCurrency(totalReported)}
                    </p>
                    {closure.adminNotes ? (
                      <p className="text-[10px] text-muted-foreground truncate">Nota admin: {closure.adminNotes}</p>
                    ) : null}
                  </div>
                  <div className="text-right shrink-0">
                    <Badge className={`${statusClass} hover:${statusClass} font-bold`}>{statusLabel}</Badge>
                    <p className={`text-[10px] font-bold mt-1 ${diff === 0 ? "text-emerald-700" : diff > 0 ? "text-blue-700" : "text-red-700"}`}>
                      {diff === 0 ? "OK" : diff > 0 ? `+${formatCurrency(diff)}` : `-${formatCurrency(Math.abs(diff))}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
