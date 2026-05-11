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
} from "lucide-react";

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
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Entregas Totales" 
          value={data.summary.totalDeliveries} 
          icon={<TrendingUp size={20} />} 
          color="green"
          footer="Órdenes entregadas con éxito"
        />
        <MetricCard 
          title="Venta Total" 
          value={`Bs. ${(data.summary.totalRevenue / 100).toLocaleString()}`} 
          icon={<DollarSign size={20} />} 
          color="blue"
          footer="Ingresos brutos generados"
        />
        <MetricCard 
          title="Ticket Promedio" 
          value={`Bs. ${(data.summary.avgOrderValue / 100).toFixed(2)}`} 
          icon={<Package size={20} />} 
          color="purple"
          footer="Valor promedio por pedido"
        />
        <MetricCard 
          title="Zonas Activas" 
          value={data.zonesData.length} 
          icon={<MapPin size={20} />} 
          color="orange"
          footer="Sectores con cobertura"
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
          description="Clientes con mayor volumen de compra (Bs.)"
          icon={<Users size={18} className="text-purple-600" />}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.topCustomers} layout="vertical" margin={{ left: 20 }}>
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
                 formatter={(value: number) => `Bs. ${value.toLocaleString()}`}
                 contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar 
                dataKey="value" 
                fill="#8b5cf6" 
                radius={[0, 4, 4, 0]} 
                name="Monto (Bs.)"
                barSize={18}
              />
            </BarChart>
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
