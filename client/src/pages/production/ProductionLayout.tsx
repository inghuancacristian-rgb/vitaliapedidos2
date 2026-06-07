import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  BarChart3,
  Beaker,
  Box,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Coins,
  Droplet,
  FileBarChart,
  FileText,
  Home,
  Layers,
  Package,
  Scale,
  Sprout,
  Store,
} from "lucide-react";
import { useState } from "react";
import { useProductionControl } from "@/lib/productionControl";

const modules = [
  { slug: "home", label: "Inicio", title: "KéfirControl", icon: Home },
  { slug: "products", label: "Productos", title: "Módulo de Productos Elaborados", icon: Store },
  { slug: "batches", label: "Lotes", title: "Gestión de Lotes", icon: Layers },
  { slug: "orders", label: "Órdenes", title: "Plan Maestro de Producción", icon: ClipboardList },
  { slug: "audit", label: "Auditoría", title: "Auditoría Industrial y Dossier", icon: FileBarChart },
  { slug: "nodules", label: "Nódulos", title: "Nódulos de Kéfir", icon: Sprout },
  { slug: "reports", label: "Reportes", title: "Análisis y Reportes", icon: BarChart3 },
  { slug: "inventory", label: "Inventario de Producción", title: "Control de Inventario", icon: Package },
  { slug: "quality", label: "Calidad", title: "Evaluación de Calidad", icon: Beaker },
  { slug: "costs", label: "Costos", title: "Rentabilidad", icon: Coins },
  { slug: "yields", label: "Rendimientos", title: "Rendimientos de Producción", icon: Scale },
];

function todayLabel() {
  return new Date().toISOString().slice(0, 10);
}

export default function ProductionLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const control = useProductionControl();
  const current = modules.find((module) => location === `/production/${module.slug}`) || modules[0];
  const CurrentIcon = current.icon;

  return (
    <div className="production-shell flex h-dvh overflow-hidden bg-[#f5f7fb] text-[#313131]">
      <aside
        className={cn(
          "relative hidden h-dvh shrink-0 flex-col overflow-visible border-r border-[#e1e4e8] bg-white transition-[width] duration-300 xl:flex",
          collapsed ? "w-[68px]" : "w-[260px]"
        )}
      >
        <div className="flex min-h-[72px] items-center gap-3 overflow-hidden border-b border-[#e1e4e8] px-[18px] py-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#36469a_0%,#3dcdff_100%)] text-white shadow-[0_0_20px_#36469a26]">
            <Droplet className="h-[22px] w-[22px]" />
          </div>
          <span className={cn("whitespace-nowrap text-lg font-extrabold tracking-[-0.02em]", collapsed && "w-0 opacity-0")}>
            KéfirControl
          </span>
        </div>

        <button
          type="button"
          className="absolute right-[-16px] top-[22px] z-20 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[linear-gradient(135deg,#36469a_0%,#3dcdff_100%)] text-white shadow-[0_2px_10px_#36469a73,0_0_0_3px_#36469a26] transition hover:scale-110"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expandir navegación" : "Contraer navegación"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-hidden px-2.5 py-4">
          {modules.map((module) => {
            const isActive = location === `/production/${module.slug}` || (location === "/production" && module.slug === "home");
            const Icon = module.icon;
            return (
              <Link key={module.slug} href={`/production/${module.slug}`}>
                <a
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-[46px] items-center gap-3 overflow-hidden whitespace-nowrap rounded-xl px-3 text-sm font-medium text-[#616569] transition hover:translate-x-1 hover:bg-[#f0f2f3] hover:text-[#36469a]",
                    collapsed && "justify-center hover:translate-x-0",
                    isActive &&
                      "bg-[linear-gradient(135deg,#36469a_0%,#3dcdff_100%)] font-semibold text-white shadow-[0_4px_14px_#36469a38] before:absolute before:bottom-[15%] before:left-0 before:top-[15%] before:w-1 before:rounded-r before:bg-[#3dcdff] hover:translate-x-0 hover:text-white"
                  )}
                >
                  <Icon className="h-[22px] w-[22px] shrink-0" />
                  <span className={cn("transition-opacity", collapsed && "w-0 opacity-0")}>{module.label}</span>
                </a>
              </Link>
            );
          })}
        </nav>

        <div className="overflow-hidden border-t border-[#e1e4e8] px-2.5 py-3.5">
          <Link href="/">
            <a className="mb-2 flex min-h-[46px] items-center gap-3 rounded-xl border border-[#36469a40] bg-[#36469a14] px-3 text-sm font-medium text-[#36469a] transition hover:bg-[linear-gradient(135deg,#36469a_0%,#3dcdff_100%)] hover:text-white">
              <ArrowLeft className="h-[22px] w-[22px] shrink-0" />
              <span className={cn("whitespace-nowrap transition-opacity", collapsed && "w-0 opacity-0")}>
                Volver al programa
              </span>
            </a>
          </Link>
          <span className={cn("block px-3 text-[11px] text-[#92979d] transition-opacity", collapsed && "opacity-0")}>
            v3.0.0
          </span>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-[#e1e4e8] bg-white px-4 py-4 xl:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#36469a_0%,#3dcdff_100%)] text-white">
                <CurrentIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold">{current.label}</p>
                <p className="truncate text-xs text-[#616569]">{todayLabel()} • {control.activeBatches.length} lotes activos</p>
              </div>
            </div>
            <Link href="/">
              <a className="grid h-10 w-10 place-items-center rounded-xl border border-[#e1e4e8] bg-white text-[#36469a]">
                <ArrowLeft className="h-5 w-5" />
              </a>
            </Link>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {modules.map((module) => {
              const isActive = location === `/production/${module.slug}` || (location === "/production" && module.slug === "home");
              const Icon = module.icon;
              return (
                <Link key={module.slug} href={`/production/${module.slug}`}>
                  <a
                    className={cn(
                      "flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-bold",
                      isActive ? "bg-[linear-gradient(135deg,#36469a_0%,#3dcdff_100%)] text-white" : "bg-[#f0f2f3] text-[#616569]"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {module.label}
                  </a>
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="production-content relative flex-1 overflow-y-auto">
          <header className="hidden items-center gap-4 border-b border-[#e1e4e8] bg-white px-8 py-6 xl:flex">
            <div className="min-w-0 flex-1">
              <h1 className="m-0 text-[26px] font-extrabold leading-tight tracking-[-0.03em]">{current.title}</h1>
              <p className="mt-1 text-[13px] text-[#616569]">
                {todayLabel()} • {control.activeBatches.length} lotes activos
              </p>
            </div>
            {control.inventoryAlerts.length > 0 ? (
              <span className="kefir-chip is-red">
                <Box className="h-3.5 w-3.5" />
                {control.inventoryAlerts.length} alertas
              </span>
            ) : null}
          </header>
          {children}
        </main>
      </section>
    </div>
  );
}
