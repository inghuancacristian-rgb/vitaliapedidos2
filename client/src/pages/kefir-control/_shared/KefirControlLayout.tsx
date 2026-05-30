import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  ClipboardList,
  DollarSign,
  FileText,
  FlaskConical,
  Home,
  Layers3,
  Package,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MAIN_APP_URL = "https://vitaliapedidos2-production-a969.up.railway.app/";

type KefirControlLayoutProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  activeMatch?: string;
  disabled?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Inicio",
    href: "/kefir-control/",
    icon: Home,
    activeMatch: "/kefir-control/",
  },
  {
    label: "Inventario de Producción",
    href: "/kefir-control/inventory",
    icon: Boxes,
    activeMatch: "/kefir-control/inventory",
  },
  {
    label: "Kárdex de Planta",
    href: "/kefir-control/auditoria",
    icon: FileText,
    activeMatch: "/kefir-control/auditoria",
  },
  {
    label: "Lotes",
    href: "/kefir-control/lotes",
    icon: Layers3,
    activeMatch: "/kefir-control/lotes",
  },
  { label: "Órdenes", href: "/kefir-control/ordenes", icon: ClipboardList, activeMatch: "/kefir-control/ordenes" },
  { label: "Auditoría", href: "/kefir-control/auditoria", icon: ShieldCheck, activeMatch: "/kefir-control/auditoria" },
  { label: "Nódulos", href: "/kefir-control/nodulos", icon: Package, activeMatch: "/kefir-control/nodulos" },
  { label: "Reportes", href: "/kefir-control/reportes", icon: BarChart3, activeMatch: "/kefir-control/reportes" },
  { label: "Calidad", href: "/kefir-control/calidad", icon: FlaskConical, activeMatch: "/kefir-control/calidad" },
  { label: "Costos", href: "/kefir-control/costos", icon: DollarSign, activeMatch: "/kefir-control/costos" },
  { label: "Rendimientos", href: "/kefir-control/rendimientos", icon: TrendingUp, activeMatch: "/kefir-control/rendimientos" },
];

export default function KefirControlLayout({
  title,
  subtitle,
  children,
}: KefirControlLayoutProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-500 text-white shadow-sm">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-black tracking-tight">
                KéfirControl
              </p>
              <p className="text-xs text-slate-500">Producción industrial</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {NAV_ITEMS.map(item => {
              const isActive = item.activeMatch
                ? item.activeMatch === "/kefir-control/"
                  ? location === "/kefir-control/" ||
                    location === "/kefir-control/index.html"
                  : location.startsWith(item.activeMatch)
                : false;

              if (item.disabled) {
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-400"
                    aria-disabled="true"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sky-500 text-white shadow-lg shadow-sky-200"
                      : "text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-100 p-4">
            <a
              href={MAIN_APP_URL}
              className="mb-3 flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-700 transition-colors hover:bg-sky-500 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver al programa</span>
            </a>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Estado
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                Módulo ordenado por subrutas
              </p>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
                ) : null}
              </div>
              <div className="text-sm text-slate-500">
                {new Date().toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-5 sm:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
