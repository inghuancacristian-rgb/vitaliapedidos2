import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ProductionModal } from '@/components/ProductionModal';
import { BatchDetailsModal } from '@/components/BatchDetailsModal';
import { exportProductionToPDF, exportProductionToExcel } from '@/lib/production-export';
import {
  FlaskConical,
  Droplets,
  Plus,
  ClipboardList,
  CheckCircle2,
  Clock,
  ChevronRight,
  Layers,
  ShieldCheck,
  User,
  Search,
  Filter,
  ArrowUpDown,
  X,
  FileDown,
  FileSpreadsheet,
  FileText as FilePdf,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';

export function Production() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'kefir_production' | 'nodule_washing'>('kefir_production');
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'kefir_production' | 'nodule_washing'>('all');

  const { data: batches = [], refetch, isLoading } = trpc.production.getBatches.useQuery();

  const handleOpenModal = (type: 'kefir_production' | 'nodule_washing') => {
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleViewDetails = (batch: any) => {
    setSelectedBatch(batch);
    setIsDetailsOpen(true);
  };

  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const matchesSearch = 
        b.batchNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.operatorName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = filterType === 'all' || b.type === filterType;
      
      return matchesSearch && matchesType;
    });
  }, [batches, searchQuery, filterType]);

  const stats = useMemo(() => {
    const total = batches.length;
    const completed = batches.filter((b) => b.status === 'completed').length;
    const inProgress = batches.filter((b) => b.status === 'in_progress').length;
    const elaboraciones = batches.filter((b) => b.type === 'kefir_production').length;
    return { total, completed, inProgress, elaboraciones };
  }, [batches]);

  return (
    <div className="page-shell">
      <div className="page-container space-y-6">

        {/* ── Hero Panel ── */}
        <section className="hero-panel p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="status-chip">
                  <FlaskConical className="mr-1.5 h-3.5 w-3.5 text-primary" />
                  Módulo de Planta
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                Operaciones de Producción
              </h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-xl">
                Registra elaboraciones de Kéfir y lavados de nódulos. Cada operación actualiza el inventario automáticamente con trazabilidad de lote.
              </p>
            </div>

            {/* Action Buttons — grandes para touch */}
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <button
                onClick={() => handleOpenModal('nodule_washing')}
                className="group flex-1 lg:flex-none flex items-center justify-center gap-3 rounded-2xl border-2 border-blue-200 bg-blue-50 px-5 py-4 text-sm font-bold text-blue-700 shadow-sm transition-all duration-200 hover:bg-blue-100 hover:border-blue-300 hover:shadow-md active:scale-95 touch-manipulation"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 group-hover:bg-blue-200 transition-colors">
                  <Droplets className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-extrabold text-sm">Lavado / Mantenimiento</p>
                  <p className="text-xs text-blue-500 font-medium">Obtén Queso y Suero</p>
                </div>
                <ChevronRight className="h-4 w-4 ml-auto text-blue-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => handleOpenModal('kefir_production')}
                className="group flex-1 lg:flex-none flex items-center justify-center gap-3 rounded-2xl bg-slate-900 px-5 py-4 text-sm font-bold text-white shadow-md transition-all duration-200 hover:bg-slate-800 hover:shadow-lg active:scale-95 touch-manipulation"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 group-hover:bg-white/25 transition-colors">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-extrabold text-sm">Nueva Elaboración</p>
                  <p className="text-xs text-slate-400 font-medium">Registro de Kéfir</p>
                </div>
                <ChevronRight className="h-4 w-4 ml-auto text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </section>

        {/* ── Stats Row ── */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {[
            { label: 'Total Lotes', value: stats.total, icon: Layers, color: 'bg-slate-100 text-slate-700', bar: 'bg-slate-900' },
            { label: 'Completados', value: stats.completed, icon: CheckCircle2, color: 'bg-green-50 text-green-700', bar: 'bg-green-500' },
            { label: 'En Progreso', value: stats.inProgress, icon: Clock, color: 'bg-amber-50 text-amber-700', bar: 'bg-amber-500' },
            { label: 'Elaboraciones', value: stats.elaboraciones, icon: FlaskConical, color: 'bg-indigo-50 text-indigo-700', bar: 'bg-indigo-500' },
          ].map((stat) => (
            <div key={stat.label} className="glass-panel p-4 relative overflow-hidden">
              <div className={`absolute top-0 left-0 h-1 w-full ${stat.bar}`} />
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${stat.color}`}>
                <stat.icon className="h-4.5 w-4.5" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{stat.value}</p>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">{stat.label}</p>
            </div>
          ))}
        </section>

        {/* ── Search and Filter Bar ── */}
        <section className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por lote u operario..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full">
                <X className="h-3 w-3 text-slate-400" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            {[
              { id: 'all', label: 'Todos', icon: Layers },
              { id: 'kefir_production', label: 'Elaboración', icon: FlaskConical },
              { id: 'nodule_washing', label: 'Lavado', icon: Droplets },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id as any)}
                className={`flex items-center gap-2 shrink-0 rounded-2xl px-5 py-3 text-sm font-bold transition-all ${
                  filterType === f.id
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <f.icon className="h-4 w-4" />
                {f.label}
              </button>
            ))}
          </div>
        </section>

        {/* ── Batch History ── */}
        <section className="glass-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              <h2 className="font-extrabold text-slate-900">Historial de Lotes</h2>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block text-xs text-muted-foreground font-semibold bg-slate-100 px-3 py-1 rounded-full">
                {filteredBatches.length} de {batches.length} registros
              </span>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95">
                    <FileDown className="h-3.5 w-3.5" />
                    Reportes
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 shadow-xl border-slate-100">
                  <DropdownMenuItem 
                    onClick={() => exportProductionToPDF(filteredBatches)}
                    className="flex items-center gap-2 rounded-xl py-2.5 cursor-pointer"
                  >
                    <FilePdf className="h-4 w-4 text-red-500" />
                    <span className="font-bold text-slate-700">Exportar PDF</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => exportProductionToExcel(filteredBatches)}
                    className="flex items-center gap-2 rounded-xl py-2.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    <span className="font-bold text-slate-700">Exportar Excel</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm font-medium">Cargando registros...</p>
              </div>
            </div>
          ) : batches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-4">
                <FlaskConical className="h-8 w-8 text-slate-400" />
              </div>
              <p className="font-bold text-slate-700 text-base">Sin registros todavía</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Inicia tu primer lote de elaboración o lavado para comenzar a registrar operaciones.
              </p>
              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => handleOpenModal('nodule_washing')}
                  className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100 active:scale-95 touch-manipulation"
                >
                  <Droplets className="h-4 w-4 inline mr-1.5" />
                  Lavado
                </button>
                <button
                  onClick={() => handleOpenModal('kefir_production')}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 active:scale-95 touch-manipulation"
                >
                  <Plus className="h-4 w-4 inline mr-1.5" />
                  Elaboración
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile: Cards */}
              <div className="divide-y divide-border/50 md:hidden">
                {filteredBatches.map((batch) => {
                  const isElaboracion = batch.type === 'kefir_production';
                  return (
                    <div 
                      key={batch.id} 
                      onClick={() => handleViewDetails(batch)}
                      className="flex items-center gap-4 px-5 py-4 active:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isElaboracion ? 'bg-indigo-100' : 'bg-blue-100'}`}>
                        {isElaboracion
                          ? <FlaskConical className="h-5 w-5 text-indigo-600" />
                          : <Droplets className="h-5 w-5 text-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-slate-900 text-sm truncate">{batch.batchNumber}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isElaboracion ? 'Elaboración' : 'Lavado'} · {format(new Date(batch.startDate ?? batch.createdAt), "d MMM, HH:mm", { locale: es })}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <User className="h-3 w-3 text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                            {batch.operatorName || 'Admin'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <BatchStatusBadge status={batch.status} />
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50 bg-slate-50/60">
                      <th className="px-6 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Lote</th>
                      <th className="px-6 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Tipo</th>
                      <th className="px-6 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Operario</th>
                      <th className="px-6 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Fecha</th>
                      <th className="px-6 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredBatches.map((batch) => {
                      const isElaboracion = batch.type === 'kefir_production';
                      return (
                        <tr 
                          key={batch.id} 
                          onClick={() => handleViewDetails(batch)}
                          className="group hover:bg-slate-50/80 transition-all cursor-pointer"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${isElaboracion ? 'bg-indigo-100' : 'bg-blue-100'}`}>
                                {isElaboracion
                                  ? <FlaskConical className="h-4 w-4 text-indigo-600" />
                                  : <Droplets className="h-4 w-4 text-blue-600" />}
                              </div>
                              <span className="font-bold text-slate-900 text-sm">{batch.batchNumber}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                            {isElaboracion ? 'Elaboración de Kéfir' : 'Lavado de Nódulos'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 border border-slate-200">
                                <User className="h-3 w-3 text-slate-500" />
                              </div>
                              <span className="text-sm font-bold text-slate-700">{batch.operatorName || 'Admin'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {format(new Date(batch.startDate ?? batch.createdAt), "d 'de' MMM, HH:mm", { locale: es })}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-between">
                              <BatchStatusBadge status={batch.status} />
                              <ChevronRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* ── Info Footer ── */}
        <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
          <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 font-medium leading-relaxed">
            Cada lote finalizado actualiza automáticamente el stock de inventario y registra el movimiento con el número de lote para trazabilidad completa.
          </p>
        </div>

      </div>

      <ProductionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type={modalType}
        onSuccess={() => {
          setIsModalOpen(false);
          refetch();
        }}
      />

      <BatchDetailsModal
        batch={selectedBatch}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedBatch(null);
        }}
      />
    </div>
  );
}

function BatchStatusBadge({ status }: { status: string }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Completado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
      <Clock className="h-3.5 w-3.5" />
      En Progreso
    </span>
  );
}
