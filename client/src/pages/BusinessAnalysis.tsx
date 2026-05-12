import { useState } from "react";
import { trpc } from "../utils/trpc";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  Users,
  Package,
  MapPin,
  Share2,
  Calendar,
  DollarSign,
  Info,
  Briefcase,
  ShoppingCart,
  Download,
  FileText,
  UserCheck,
  UserPlus,
  RefreshCw,
} from "lucide-react";
import { exportBusinessToPDF, exportBusinessToExcel } from "../lib/business-export";

// Colores para los gráficos
const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

export default function BusinessAnalysis() {
  const [period, setPeriod] = useState<"7d" | "30d" | "month" | "all" | "custom">("30d");
  const [customDates, setCustomDates] = useState({
    start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd")
  });

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case "7d":
        return { startDate: format(subDays(now, 7), "yyyy-MM-dd"), endDate: format(now, "yyyy-MM-dd") };
      case "30d":
        return { startDate: format(subDays(now, 30), "yyyy-MM-dd"), endDate: format(now, "yyyy-MM-dd") };
      case "month":
        return { startDate: format(startOfMonth(now), "yyyy-MM-dd"), endDate: format(endOfMonth(now), "yyyy-MM-dd") };
      case "custom":
        return { startDate: customDates.start, endDate: customDates.end };
      default:
        return { startDate: "2024-01-01", endDate: format(now, "yyyy-MM-dd") };
    }
  };

  const { startDate, endDate } = getDateRange();

  const { data, isLoading } = trpc.reports.getBusinessAnalysis.useQuery({
    startDate,
    endDate,
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Análisis de Negocio</h1>
          <p className="text-gray-500">Métricas avanzadas y comportamiento de clientes</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {period === "custom" && (
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
              <input 
                type="date" 
                value={customDates.start} 
                onChange={(e) => setCustomDates(prev => ({ ...prev, start: e.target.value }))}
                className="text-xs font-bold bg-transparent border-none focus:ring-0"
              />
              <span className="text-gray-400">/</span>
              <input 
                type="date" 
                value={customDates.end} 
                onChange={(e) => setCustomDates(prev => ({ ...prev, end: e.target.value }))}
                className="text-xs font-bold bg-transparent border-none focus:ring-0"
              />
            </div>
          )}

          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
            {(["7d", "30d", "month", "all", "custom"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  period === p 
                    ? "bg-green-600 text-white shadow-sm" 
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {p === "7d" ? "7 días" : p === "30d" ? "30 días" : p === "month" ? "Mes" : p === "custom" ? "Rango" : "Todo"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (data) exportBusinessToPDF(data, period === "7d" ? "Últimos 7 días" : period === "30d" ? "Últimos 30 días" : period === "month" ? "Este Mes" : period === "custom" ? "Rango Personalizado" : "Todo el histórico");
              }}
              disabled={!data || isLoading}
              className="flex items-center justify-center p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Exportar a PDF"
            >
              <FileText className="h-5 w-5" />
            </button>
            <button
              onClick={() => {
                if (data) exportBusinessToExcel(data, period === "7d" ? "Últimos 7 días" : period === "30d" ? "Últimos 30 días" : period === "month" ? "Este Mes" : period === "custom" ? "Rango Personalizado" : "Todo el histórico");
              }}
              disabled={!data || isLoading}
              className="flex items-center justify-center p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Exportar a Excel"
            >
              <Download className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-gray-500 animate-pulse font-medium">Cargando análisis de negocio...</p>
        </div>
      ) : !data ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 bg-white rounded-3xl border border-dashed border-gray-300 p-12">
          <div className="p-6 rounded-full bg-gray-50 text-gray-300">
            <TrendingUp className="h-12 w-12" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-gray-800">No hay datos disponibles</h3>
            <p className="text-gray-500 max-w-sm">No se encontraron entregas ni ventas para el periodo comprendido entre el {format(new Date(startDate), "dd 'de' MMMM", { locale: es })} y el {format(new Date(endDate), "dd 'de' MMMM", { locale: es })}.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Metric Cards - Row 1: Operaciones */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
        <MetricCard 
          title="Transacciones Totales" 
          value={data.summary.totalTransactions} 
          icon={<TrendingUp size={20} />} 
          color="blue"
          footer="Entregas + ventas del período"
        />
        <MetricCard 
          title="N° de Entregas" 
          value={data.summary.totalDeliveries} 
          icon={<Package size={20} />} 
          color="green"
          footer="Pedidos delivery completados"
        />
        <MetricCard 
          title="N° de Ventas" 
          value={data.summary.totalSales} 
          icon={<ShoppingCart size={20} />} 
          color="orange"
          footer="Ventas directas / caja"
        />
      </div>

      {/* Metric Cards - Row 2: Finanzas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Ingresos Brutos" 
          value={`Bs. ${(data.summary.totalRevenue / 100).toLocaleString()}`} 
          icon={<DollarSign size={20} />} 
          color="blue"
          footer="Dinero total ingresado"
        />
        <MetricCard 
          title="Gastos Operativos" 
          value={`Bs. ${(data.summary.totalExpenses / 100).toLocaleString()}`} 
          icon={<Briefcase size={20} />} 
          color="red"
          footer="Egresos pagados en el período"
        />
        <MetricCard 
          title="Utilidad Neta" 
          value={`Bs. ${(data.summary.netIncome / 100).toLocaleString()}`} 
          icon={<TrendingUp size={20} />} 
          color="purple"
          footer="Ganancia real obtenida"
        />
        <MetricCard 
          title="Ticket Promedio" 
          value={`Bs. ${(data.summary.avgOrderValue / 100).toFixed(2)}`} 
          icon={<ShoppingCart size={20} />} 
          color="teal"
          footer="Venta promedio por pedido"
        />
      </div>

      {/* Metric Cards - Row 3: Retención */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Clientes del Período" 
          value={data.summary.totalCustomers} 
          icon={<Users size={20} />} 
          color="indigo"
          footer="Total clientes únicos atendidos"
        />
        <MetricCard 
          title="Clientes Nuevos" 
          value={data.summary.newCustomers} 
          icon={<UserPlus size={20} />} 
          color="teal"
          footer="Primera compra en el período"
        />
        <MetricCard 
          title="Clientes Recurrentes" 
          value={data.summary.returningCustomers} 
          icon={<UserCheck size={20} />} 
          color="green"
          footer="Ya compraron antes"
        />
        <MetricCard 
          title="Tasa de Retención" 
          value={`${data.summary.retentionRate}%`} 
          icon={<RefreshCw size={20} />} 
          color={data.summary.retentionRate >= 40 ? "purple" : data.summary.retentionRate >= 20 ? "orange" : "red"}
          footer={data.summary.retentionRate >= 40 ? "¡Excelente fidelización!" : data.summary.retentionRate >= 20 ? "Mejorable" : "Foco en retención"}
        />
      </div>

      {/* Metric Cards - Row 4: Ingeniería Comercial & Marketing */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
        <MetricCard 
          title="Frecuencia de Compra" 
          value={(data.summary.totalTransactions / Math.max(1, data.summary.totalCustomers)).toFixed(2)} 
          icon={<RefreshCw size={20} />} 
          color="teal"
          footer="Compras promedio por cliente"
        />
        <MetricCard 
          title="Venta Promedio por Cliente" 
          value={`Bs. ${(data.summary.totalRevenue / 100 / Math.max(1, data.summary.totalCustomers)).toFixed(2)}`} 
          icon={<DollarSign size={20} />} 
          color="indigo"
          footer="Ingreso medio por cliente único"
        />
        <MetricCard 
          title="Crecimiento de Cartera" 
          value={`${((data.summary.newCustomers / Math.max(1, data.summary.totalCustomers)) * 100).toFixed(1)}%`} 
          icon={<UserPlus size={20} />} 
          color="blue"
          footer="% de clientes nuevos vs total"
        />
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendencia de Entregas */}
        <ChartCard 
          title="Tendencia de Entregas" 
          description="Pedidos entregados por día"
          icon={<Calendar size={18} className="text-green-600" />}
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.deliveriesData}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                fontSize={12} 
                tickFormatter={(str) => format(new Date(str), "dd MMM", { locale: es })}
                axisLine={false}
                tickLine={false}
              />
              <YAxis fontSize={12} axisLine={false} tickLine={false} />
              <Tooltip 
                labelFormatter={(str) => format(new Date(str), "EEEE dd 'de' MMMM", { locale: es })}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorCount)" 
                name="Entregas"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Sabores más pedidos */}
        <ChartCard 
          title="Top 10 Sabores / Productos" 
          description="Unidades entregadas por producto"
          icon={<Package size={18} className="text-blue-600" />}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.topFlavors} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
              <XAxis type="number" fontSize={12} hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                fontSize={11} 
                width={120}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                 contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar 
                dataKey="quantity" 
                fill="#3b82f6" 
                radius={[0, 4, 4, 0]} 
                name="Cantidad"
                barSize={18}
              >
                {data.topFlavors.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Género */}
        <ChartCard 
          title="Perfil por Género" 
          description="Distribución de género de los clientes"
          icon={<Users size={18} className="text-pink-600" />}
        >
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data.customerDemographics}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={8}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.customerDemographics.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? "#3b82f6" : index === 1 ? "#ec4899" : "#94a3b8"} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Retención: Nuevos vs Recurrentes */}
        <ChartCard 
          title="Retención de Clientes" 
          description="Clientes nuevos vs. recurrentes en el período"
          icon={<UserCheck size={18} className="text-teal-600" />}
        >
          {data.customerRetention && data.customerRetention.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.customerRetention}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  <Cell fill="#14b8a6" />
                  <Cell fill="#8b5cf6" />
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm">
              Selecciona un rango con fecha de inicio para ver retención
            </div>
          )}
        </ChartCard>

        {/* Canales */}
        <ChartCard 
          title="Canales de Venta" 
          description="Origen de los pedidos realizados"
          icon={<Share2 size={18} className="text-orange-600" />}
        >
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data.channelsData}
                cx="50%"
                cy="50%"
                outerRadius={90}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.channelsData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Métodos de Pago */}
        <ChartCard 
          title="Métodos de Pago" 
          description="Distribución por volumen de dinero"
          icon={<DollarSign size={18} className="text-green-600" />}
        >
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data.paymentMethods}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={8}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.paymentMethods.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={["#10b981", "#3b82f6", "#f59e0b"][index % 3]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `Bs. ${value.toLocaleString()}`} />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top Clientes */}
        <ChartCard 
          title="Top 10 Clientes" 
          description="Detalle de compras y volumen por cliente"
          icon={<Users size={18} className="text-purple-600" />}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-2 font-semibold">Cliente</th>
                  <th className="py-3 px-2 font-semibold text-center">Compras</th>
                  <th className="py-3 px-2 font-semibold text-right">Total (Bs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.topCustomers.map((customer, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 flex items-center justify-center rounded-full bg-purple-50 text-purple-600 text-[10px] font-bold">
                          {i + 1}
                        </span>
                        <span className="font-medium text-gray-700 truncate max-w-[120px]">
                          {customer.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        customer.count >= 2 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {customer.count} {customer.count === 1 ? 'vez' : 'veces'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-gray-900">
                      Bs. {customer.value.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        {/* Distribución de Gastos */}
        <ChartCard 
          title="Gastos por Categoría" 
          description="Egresos operativos del negocio"
          icon={<ShoppingCart size={18} className="text-orange-600" />}
        >
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data.expensesByCategory}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.expensesByCategory.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `Bs. ${value.toLocaleString()}`} />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Zonas */}
        <ChartCard 
          title="Distribución Geográfica" 
          description="Zonas con mayor volumen de entregas"
          icon={<MapPin size={18} className="text-red-600" />}
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.zonesData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" fontSize={11} axisLine={false} tickLine={false} />
              <YAxis fontSize={12} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} name="Pedidos" barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <div className="pt-8 pb-4 text-center space-y-1">
        <p className="text-gray-300 text-[10px] font-mono uppercase tracking-widest">Análisis de Negocio v1.2.1 • Sincronizado</p>
        {data.debug && (
          <p className="text-[8px] text-gray-200 font-mono">
            Debug: O:{data.debug.deliveredOrdersFound} S:{data.debug.completedSalesFound} T:{data.debug.totalTransactions} | {data.debug.startDate} to {data.debug.endDate}
          </p>
        )}
      </div>
    </>
  )}
</div>
);
}

function MetricCard({ title, value, icon, color, footer }: { title: string, value: string | number, icon: React.ReactNode, color: string, footer: string }) {
  const colorClasses = {
    green: "from-green-50 text-green-600 bg-green-100",
    blue: "from-blue-50 text-blue-600 bg-blue-100",
    purple: "from-purple-50 text-purple-600 bg-purple-100",
    orange: "from-orange-50 text-orange-600 bg-orange-100",
    red: "from-red-50 text-red-600 bg-red-100",
    teal: "from-teal-50 text-teal-600 bg-teal-100",
    indigo: "from-indigo-50 text-indigo-600 bg-indigo-100",
  }[color] || "from-gray-50 text-gray-600 bg-gray-100";

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-6 bg-gradient-to-br ${colorClasses.split(' ')[0]} to-white`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">{title}</p>
          <h3 className="text-2xl font-extrabold text-gray-900">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl ${colorClasses.split(' ').slice(1).join(' ')}`}>
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-xs text-gray-500">
        <Info size={12} />
        {footer}
      </div>
    </div>
  );
}

function ChartCard({ title, description, icon, children, className }: { title: string, description: string, icon: React.ReactNode, children: React.ReactNode, className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      <div className="px-6 py-5 border-b border-gray-50">
        <div className="flex items-center gap-2 mb-0.5">
          {icon}
          <h3 className="font-bold text-gray-900">{title}</h3>
        </div>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
