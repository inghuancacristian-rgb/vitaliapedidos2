import { useState, useMemo } from "react";
import { trpc } from "../utils/trpc";
import { format, subDays, startOfMonth, endOfMonth, startOfQuarter } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
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
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
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
  LayoutDashboard,
  Award,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
} from "lucide-react";
import { exportBusinessToPDF, exportBusinessToExcel } from "../lib/business-export";

// Colores para los gr├íficos
const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

export default function BusinessAnalysis() {
  const [activeTab, setActiveTab] = useState<"overview" | "ranking" | "bcg">("overview");
  const [period, setPeriod] = useState<"7d" | "30d" | "month" | "quarter" | "year" | "custom">("30d");
  const [sortBy, setSortBy] = useState<"revenue" | "units" | "margin" | "trend">("revenue");
  
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
        return { startDate: format(startOfMonth(now), "yyyy-MM-dd"), endDate: format(now, "yyyy-MM-dd") };
      case "quarter":
        return { startDate: format(startOfQuarter(now), "yyyy-MM-dd"), endDate: format(now, "yyyy-MM-dd") };
      case "year":
        return { startDate: format(new Date(now.getFullYear(), 0, 1), "yyyy-MM-dd"), endDate: format(now, "yyyy-MM-dd") };
      case "custom":
        return { startDate: customDates.start, endDate: customDates.end };
      default:
        return { startDate: format(subDays(now, 30), "yyyy-MM-dd"), endDate: format(now, "yyyy-MM-dd") };
    }
  };

  const { startDate, endDate } = getDateRange();

  const { data, isLoading } = trpc.reports.getBusinessAnalysis.useQuery({
    startDate,
    endDate,
  });

  const sortedRanking = useMemo(() => {
    if (!data?.productRanking) return [];
    return [...data.productRanking].sort((a, b) => {
      if (sortBy === "revenue") return b.revenue - a.revenue;
      if (sortBy === "units") return b.units - a.units;
      if (sortBy === "margin") return b.margin - a.margin;
      if (sortBy === "trend") return b.trend - a.trend;
      return 0;
    });
  }, [data?.productRanking, sortBy]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 bg-gray-50/50 min-h-screen">
      {/* Header Interactivo */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
              An├ílisis <span className="text-green-600">Inteligente</span>
            </h1>
            <p className="text-gray-500 font-medium">Transformando datos en decisiones estrat├®gicas</p>
          </div>

          <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-gray-200 shadow-sm">
            <TabButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")} icon={<LayoutDashboard size={16} />} label="General" />
            <TabButton active={activeTab === "ranking"} onClick={() => setActiveTab("ranking")} icon={<Award size={16} />} label="Ranking" />
            <TabButton active={activeTab === "bcg"} onClick={() => setActiveTab("bcg")} icon={<Target size={16} />} label="Matriz BCG" />
          </div>
        </div>

        {/* Filtros Premium */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Per├¡odo:</span>
            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
              <PeriodButton active={period === "month"} onClick={() => setPeriod("month")} label="Este Mes" />
              <PeriodButton active={period === "quarter"} onClick={() => setPeriod("quarter")} label="Trimestre" />
              <PeriodButton active={period === "year"} onClick={() => setPeriod("year")} label="A├▒o" />
            </div>
          </div>

          {activeTab === "ranking" && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ordenar:</span>
              <div className="relative group">
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="appearance-none bg-gray-50 border border-gray-100 text-gray-900 text-sm font-bold rounded-xl focus:ring-green-500 focus:border-green-500 block w-full pl-4 pr-10 py-2.5 cursor-pointer transition-all hover:bg-white"
                >
                  <option value="revenue">Por Ingresos</option>
                  <option value="units">Por Unidades</option>
                  <option value="margin">Por Margen (%)</option>
                  <option value="trend">Por Tendencia</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-green-600 transition-colors" size={16} />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => data && exportBusinessToPDF(data, "Reporte de An├ílisis")}
              disabled={isLoading || !data}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
            >
              <FileText size={18} />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={() => data && exportBusinessToExcel(data, "An├ílisis de Negocio")}
              disabled={isLoading || !data}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-xl font-bold text-sm shadow-lg shadow-green-200 transition-all disabled:opacity-50"
            >
              <Download size={18} />
              <span className="hidden sm:inline">Excel</span>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[400px] gap-4"
          >
            <div className="w-16 h-16 border-4 border-green-100 border-t-green-600 rounded-full animate-spin" />
            <p className="text-gray-400 font-bold animate-pulse">Procesando inteligencia de negocio...</p>
          </motion.div>
        ) : !data ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[40px] p-12 border-2 border-dashed border-gray-100 text-center space-y-4"
          >
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
              <TrendingUp size={40} />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Sin datos en este periodo</h3>
            <p className="text-gray-500 max-w-sm mx-auto">Prueba seleccionando un rango de fechas m├ís amplio o verifica tus ventas recientes.</p>
          </motion.div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === "overview" && (
              <OverviewContent data={data} />
            )}
            {activeTab === "ranking" && (
              <RankingContent ranking={sortedRanking} />
            )}
            {activeTab === "bcg" && (
              <BCGContent bcgData={data.bcgMatrix} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pt-8 pb-4 text-center">
        <p className="text-gray-300 text-[10px] font-mono uppercase tracking-[0.3em]">
          Business Intelligence Engine v2.0 ÔÇó Real-time Data Sync
        </p>
      </div>
    </div>
  );
}

// --- Sub-componentes ---

function OverviewContent({ data }: { data: any }) {
  return (
    <div className="space-y-8">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Ingresos Brutos" value={`Bs. ${(data.summary.totalRevenue / 100).toLocaleString()}`} icon={<DollarSign size={24} />} color="emerald" footer="Total del periodo" />
        <MetricCard title="Utilidad Neta" value={`Bs. ${(data.summary.netIncome / 100).toLocaleString()}`} icon={<TrendingUp size={24} />} color="blue" footer="Ingresos - Gastos" />
        <MetricCard title="Transacciones" value={data.summary.totalTransactions} icon={<ShoppingCart size={24} />} color="orange" footer="Ventas + Entregas" />
        <MetricCard title="Retenci├│n" value={`${data.summary.retentionRate}%`} icon={<RefreshCw size={24} />} color="purple" footer="Clientes recurrentes" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartCard title="Tendencia de Ventas" description="Actividad diaria del negocio" icon={<Calendar className="text-emerald-500" />}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.deliveriesData}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="date" fontSize={11} tickFormatter={(str) => format(new Date(str), "dd MMM", { locale: es })} axisLine={false} tickLine={false} />
              <YAxis fontSize={11} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }} />
              <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} fill="url(#colorCount)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Perfil de Clientes" description="Distribuci├│n por g├®nero" icon={<Users className="text-blue-500" />}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.customerDemographics} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {data.customerDemographics.map((_: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function RankingContent({ ranking }: { ranking: any[] }) {
  return (
    <div className="space-y-6">
      {ranking.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
        >
          {index === 0 && (
            <div className="absolute top-0 right-0 bg-green-100 text-green-700 px-4 py-1.5 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest">
              Market Leader
            </div>
          )}
          
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex items-center gap-4 min-w-[200px]">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl ${index === 0 ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                {index + 1}
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 group-hover:text-green-600 transition-colors">{item.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${item.trend >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {item.trend >= 0 ? <ArrowUpRight size={10} className="mr-1" /> : <ArrowDownRight size={10} className="mr-1" />}
                    {Math.abs(item.trend)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
              <RankingStat label="Ingresos" value={`Bs. ${item.revenue.toLocaleString()}`} color="green" />
              <RankingStat label="Unidades" value={item.units} color="blue" />
              <RankingStat label="Margen" value={`${item.margin}%`} color="orange" />
              <RankingStat label="Previo" value={item.prevUnits} color="gray" />
            </div>

            <div className="w-full md:w-48 h-2 bg-gray-100 rounded-full overflow-hidden mt-4 md:mt-0">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (item.revenue / ranking[0].revenue) * 100)}%` }}
                className={`h-full ${index === 0 ? 'bg-green-600' : index === 1 ? 'bg-blue-500' : 'bg-orange-400'}`}
              />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function BCGContent({ bcgData }: { bcgData: any[] }) {
  const maxUnits = Math.max(...bcgData.map(d => d.units), 1);
  const maxTrend = Math.max(...bcgData.map(d => Math.abs(d.trend)), 10);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm overflow-hidden relative">
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
          <div className="w-full h-px bg-gray-900" />
          <div className="h-full w-px bg-gray-900" />
        </div>

        {/* Labels Cuadrantes */}
        <div className="absolute top-10 left-10 text-[10px] font-black text-gray-300 uppercase tracking-widest">Interrogantes</div>
        <div className="absolute top-10 right-10 text-[10px] font-black text-gray-300 uppercase tracking-widest text-right">Estrellas</div>
        <div className="absolute bottom-10 left-10 text-[10px] font-black text-gray-300 uppercase tracking-widest">Perros</div>
        <div className="absolute bottom-10 right-10 text-[10px] font-black text-gray-300 uppercase tracking-widest text-right">Vacas</div>

        <ResponsiveContainer width="100%" height={500}>
          <ScatterChart margin={{ top: 40, right: 40, bottom: 40, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              type="number" 
              dataKey="units" 
              name="Volumen" 
              unit=" un." 
              domain={[0, maxUnits * 1.1]}
              label={{ value: 'Volumen de Ventas (Unidades)', position: 'bottom', offset: 0, fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              type="number" 
              dataKey="trend" 
              name="Crecimiento" 
              unit="%" 
              domain={[-maxTrend, maxTrend]}
              label={{ value: 'Crecimiento de Ventas (%)', angle: -90, position: 'left', fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <ZAxis type="number" dataKey="revenue" range={[100, 2000]} name="Ingresos" />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xl space-y-2">
                      <p className="font-black text-gray-900">{data.name}</p>
                      <div className="text-xs space-y-1">
                        <p className="flex justify-between gap-4"><span>Volumen:</span> <span className="font-bold">{data.units} un.</span></p>
                        <p className="flex justify-between gap-4"><span>Tendencia:</span> <span className={`font-bold ${data.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>{data.trend}%</span></p>
                        <p className="flex justify-between gap-4"><span>Ingresos:</span> <span className="font-bold">Bs. {data.revenue.toLocaleString()}</span></p>
                        <div className="mt-2 pt-2 border-t border-gray-50">
                          <span className="px-2 py-0.5 rounded-full bg-gray-900 text-white text-[8px] font-black uppercase">Cuadrante {data.quadrant}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine x={maxUnits / 2} stroke="#cbd5e1" strokeWidth={2} />
            <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={2} />
            <Scatter name="Productos" data={bcgData} fill="#10b981">
              {bcgData.map((entry: any, index: number) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.quadrant === "Estrella" ? "#10b981" : entry.quadrant === "Vaca" ? "#3b82f6" : entry.quadrant === "Interrogante" ? "#f59e0b" : "#ef4444"} 
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-6">
        <BCGInfoCard title="Estrellas" color="green" description="Alta participaci├│n y crecimiento. Requieren inversi├│n para mantener su liderazgo." />
        <BCGInfoCard title="Vacas" color="blue" description="L├¡deres en mercados maduros. Generan el flujo de caja necesario para financiar otros." />
        <BCGInfoCard title="Interrogantes" color="orange" description="Productos nuevos en crecimiento. Potencial de ser estrellas o desaparecer." />
        <BCGInfoCard title="Perros" color="red" description="Baja rentabilidad y poco crecimiento. Evaluar descontinuaci├│n o reposicionamiento." />
      </div>
    </div>
  );
}

// --- Helpers UI ---

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
        active ? "bg-green-600 text-white shadow-md shadow-green-200" : "text-gray-500 hover:bg-gray-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function PeriodButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
        active ? "bg-white text-green-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
      }`}
    >
      {label}
    </button>
  );
}

function MetricCard({ title, value, icon, color, footer }: { title: string, value: string | number, icon: React.ReactNode, color: string, footer: string }) {
  const colors: any = {
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-orange-50 text-orange-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-2xl ${colors[color] || colors.emerald}`}>
          {icon}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
          <h3 className="text-2xl font-black text-gray-900 mt-1">{value}</h3>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
        <Info size={12} className="text-gray-300" />
        {footer}
      </div>
    </div>
  );
}

function ChartCard({ title, description, icon, children }: { title: string, description: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            {icon}
            {title}
          </h3>
          <p className="text-xs text-gray-400 font-bold mt-1">{description}</p>
        </div>
      </div>
      <div className="p-8">
        {children}
      </div>
    </div>
  );
}

function RankingStat({ label, value, color }: { label: string, value: string | number, color: string }) {
  const colors: any = {
    green: "text-green-600",
    blue: "text-blue-600",
    orange: "text-orange-600",
    gray: "text-gray-400",
  };
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{label}</p>
      <p className={`text-sm font-black ${colors[color] || 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

function BCGInfoCard({ title, color, description }: { title: string, color: string, description: string }) {
  const colors: any = {
    green: "bg-green-50 border-green-100 text-green-600",
    blue: "bg-blue-50 border-blue-100 text-blue-600",
    orange: "bg-orange-50 border-orange-100 text-orange-600",
    red: "bg-red-50 border-red-100 text-red-600",
  };
  return (
    <div className={`p-6 rounded-[32px] border ${colors[color]} space-y-2`}>
      <h4 className="font-black text-sm uppercase tracking-widest">{title}</h4>
      <p className="text-xs font-medium opacity-80 leading-relaxed">{description}</p>
    </div>
  );
}
