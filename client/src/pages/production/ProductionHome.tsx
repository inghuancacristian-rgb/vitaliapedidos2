import {
  getOrderStatusLabel,
  getStageLabel,
  getTypeLabel,
  useProductionControl,
} from "@/lib/productionControl";
import {
  AlertTriangle,
  BarChart3,
  Beaker,
  CheckCircle2,
  ClipboardList,
  Droplet,
  History,
  Layers,
  Package,
  PackagePlus,
  Scale,
  Store,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Link } from "wouter";

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  accent: string;
}) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 16,
      padding: "20px 22px",
      border: "1px solid #e8ecf0",
      boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
      display: "flex",
      alignItems: "center",
      gap: 16,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", right: -14, top: -14,
        width: 80, height: 80, borderRadius: "50%",
        background: `${accent}12`,
      }} />
      <div style={{
        width: 46, height: 46, borderRadius: 12, flexShrink: 0,
        background: `${accent}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon style={{ width: 22, height: 22, color: accent }} />
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#1a1a2e", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#616569", marginTop: 4 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: "#adb5bd", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function WorkflowStep({
  number,
  title,
  desc,
  icon: Icon,
  href,
  accent,
  active,
}: {
  number: number;
  title: string;
  desc: string;
  icon: React.ElementType;
  href: string;
  accent: string;
  active?: boolean;
}) {
  return (
    <Link href={href}>
      <a style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "16px 18px", borderRadius: 14,
        border: active ? `2px solid ${accent}` : "1.5px solid #e8ecf0",
        background: active ? `${accent}08` : "#fff",
        textDecoration: "none", cursor: "pointer",
        transition: "all 0.2s ease",
        boxShadow: active ? `0 4px 18px ${accent}20` : "0 2px 8px rgba(0,0,0,0.04)",
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: `${accent}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative",
        }}>
          <Icon style={{ width: 20, height: 20, color: accent }} />
          <span style={{
            position: "absolute", top: -6, right: -6,
            width: 18, height: 18, borderRadius: "50%",
            background: accent, color: "#fff",
            fontSize: 9, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{number}</span>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e" }}>{title}</div>
          <div style={{ fontSize: 11, color: "#616569", marginTop: 2 }}>{desc}</div>
        </div>
      </a>
    </Link>
  );
}

export default function ProductionHome() {
  const control = useProductionControl();
  const today = new Date().toISOString().slice(0, 10);
  const todayMovements = control.movements.filter((m) => m.date.slice(0, 10) === today).length;
  const latestBatches = control.batches.slice(0, 5);
  const latestOrders  = control.orders.slice(0, 4);
  const pendingOrders  = control.orders.filter((o) => o.status === "pendiente").length;
  const completedToday = control.batches.filter(
    (b) => b.status === "finalizado" && b.startDate === today
  ).length;

  // Mapa de colores por stage
  const stageColor = (stage: string) => {
    if (stage === "preparacion") return "#6366f1";
    if (stage === "fermentacion") return "#00a878";
    if (stage === "envasado") return "#3b82f6";
    if (stage === "finalizado") return "#64748b";
    return "#f59e0b";
  };

  return (
    <div style={{ padding: "24px 28px", minHeight: "100%" }}>

      {/* Hero greeting */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "linear-gradient(135deg,#00a878,#3dcdff)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Droplet style={{ width: 20, height: 20, color: "#fff" }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#1a1a2e", letterSpacing: "-0.02em" }}>
              Panel de Control — KéfirControl
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: "#616569" }}>
              {today} · Resumen operativo de la planta
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        <KpiCard icon={ClipboardList} label="Órdenes Pendientes"  value={pendingOrders}               sub="Listas para lote"     accent="#f59e0b" />
        <KpiCard icon={Layers}        label="Lotes Activos"        value={control.activeBatches.length} sub="En proceso de planta"  accent="#3b82f6" />
        <KpiCard icon={Package}       label="Alertas de Stock"     value={control.inventoryAlerts.length} sub="Insumos bajo mínimo" accent="#ef4444" />
        <KpiCard icon={History}       label="Movimientos Hoy"      value={todayMovements}             sub="Kardex de producción"   accent="#00a878" />
      </div>

      {/* Flujo de trabajo */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Zap style={{ width: 16, height: 16, color: "#f59e0b" }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Flujo de Producción
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <WorkflowStep number={1} title="Productos"   desc="Catálogo maestro"         icon={Store}         href="/production/products" accent="#6366f1" />
          <WorkflowStep number={2} title="Órdenes"     desc="Registrar demanda"        icon={ClipboardList} href="/production/orders"   accent="#f59e0b" active={pendingOrders > 0} />
          <WorkflowStep number={3} title="Lotes"       desc="Preparar y avanzar"       icon={Layers}        href="/production/batches"  accent="#3b82f6" active={control.activeBatches.length > 0} />
          <WorkflowStep number={4} title="Calidad"     desc="Evaluar producto"         icon={Beaker}        href="/production/quality"  accent="#00a878" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 12 }}>
          <WorkflowStep number={5} title="Inventario"  desc="Cerrar stock"             icon={Package}       href="/production/inventory" accent="#64748b" />
          <WorkflowStep number={6} title="Rendimientos" desc="Calcular eficiencia"     icon={Scale}         href="/production/yields"   accent="#10b981" />
          <WorkflowStep number={7} title="Reportes"    desc="Análisis y KPIs"          icon={BarChart3}     href="/production/reports"  accent="#8b5cf6" />
          <WorkflowStep number={8} title="Nódulos"     desc="Gestionar cepas"          icon={TrendingUp}    href="/production/nodules"  accent="#ec4899" />
        </div>
      </div>

      {/* Dos columnas: Lotes activos + Órdenes recientes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Lotes activos */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8ecf0", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f3f5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Layers style={{ width: 16, height: 16, color: "#3b82f6" }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e" }}>Planta Ahora</span>
            </div>
            <Link href="/production/batches">
              <a style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6", textDecoration: "none" }}>Ver todos →</a>
            </Link>
          </div>
          <div style={{ padding: "12px 0" }}>
            {latestBatches.length === 0 ? (
              <div style={{ padding: "28px", textAlign: "center", color: "#adb5bd", fontSize: 12 }}>
                <Layers style={{ width: 32, height: 32, margin: "0 auto 8px", opacity: 0.3 }} />
                <p style={{ margin: 0 }}>Sin lotes activos</p>
              </div>
            ) : (
              latestBatches.map((batch) => {
                const sc = stageColor(batch.stage);
                return (
                  <div key={batch.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 20px", borderBottom: "1px solid #f8f9fa",
                    gap: 12,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: sc, flexShrink: 0 }} />
                      <div>
                        <span style={{ fontWeight: 800, fontSize: 13, color: "#1a1a2e" }}>{batch.batchNumber}</span>
                        <span style={{ display: "block", fontSize: 10, color: "#616569" }}>
                          {getTypeLabel(batch.type)} · {batch.operator}
                        </span>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20,
                      background: `${sc}15`, color: sc, border: `1px solid ${sc}40`,
                    }}>
                      {getStageLabel(batch.stage)}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Alertas de inventario */}
          {control.inventoryAlerts.length > 0 && (
            <div style={{ margin: "0 14px 14px", padding: "12px 14px", borderRadius: 12, background: "#fffbeb", border: "1px solid #fde68a" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <AlertTriangle style={{ width: 13, height: 13, color: "#f59e0b" }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: "#b45309" }}>Revisar stock de planta</span>
              </div>
              {control.inventoryAlerts.slice(0, 3).map((item) => (
                <div key={item.id} style={{ fontSize: 11, color: "#78350f", marginTop: 3 }}>
                  • {item.name}: <strong>{item.quantity} {item.unit}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Órdenes recientes */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8ecf0", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f3f5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ClipboardList style={{ width: 16, height: 16, color: "#f59e0b" }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e" }}>Órdenes Recientes</span>
            </div>
            <Link href="/production/orders">
              <a style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", textDecoration: "none" }}>Ver todas →</a>
            </Link>
          </div>
          <div style={{ padding: "12px 0" }}>
            {latestOrders.length === 0 ? (
              <div style={{ padding: "28px", textAlign: "center", color: "#adb5bd", fontSize: 12 }}>
                <ClipboardList style={{ width: 32, height: 32, margin: "0 auto 8px", opacity: 0.3 }} />
                <p style={{ margin: 0 }}>Sin órdenes registradas</p>
              </div>
            ) : (
              latestOrders.map((order) => {
                const statusColor =
                  order.status === "completada" ? "#00a878" :
                  order.status === "en_proceso" ? "#3b82f6" :
                  order.status === "cancelada"  ? "#ef4444" : "#f59e0b";
                return (
                  <div key={order.id} style={{
                    padding: "10px 20px", borderBottom: "1px solid #f8f9fa",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <div>
                        <span style={{ fontWeight: 800, fontSize: 13, color: "#1a1a2e" }}>{order.id}</span>
                        <span style={{ fontSize: 11, color: "#616569", marginLeft: 8 }}>{order.client}</span>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20,
                        background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}40`,
                      }}>
                        {getOrderStatusLabel(order.status)}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: 4, borderRadius: 99, background: "#f1f3f5", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${order.progress}%`,
                        background: `linear-gradient(90deg, ${statusColor}, ${statusColor}aa)`,
                        borderRadius: 99, transition: "width 0.4s",
                      }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                      <span style={{ fontSize: 10, color: "#adb5bd" }}>{order.producedUnits} / {order.targetUnits} unid.</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: statusColor }}>{order.progress}%</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick action */}
          <div style={{ padding: "12px 16px" }}>
            <Link href="/production/orders">
              <a style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "10px", borderRadius: 10,
                background: "linear-gradient(135deg,#f59e0b,#fbbf24)",
                color: "#fff", fontWeight: 700, fontSize: 13,
                textDecoration: "none",
                boxShadow: "0 4px 12px rgba(245,158,11,0.3)",
              }}>
                <PackagePlus style={{ width: 15, height: 15 }} />
                Nueva Orden de Producción
              </a>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats secundarios */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 20 }}>
        <div style={{
          background: "linear-gradient(135deg,#00a878,#00c48c)",
          borderRadius: 14, padding: "16px 20px", color: "#fff",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.85, textTransform: "uppercase", letterSpacing: "0.06em" }}>Finalizados hoy</div>
          <div style={{ fontSize: 32, fontWeight: 800, margin: "6px 0 4px" }}>{completedToday}</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>lotes completados</div>
        </div>
        <div style={{
          background: "linear-gradient(135deg,#6366f1,#818cf8)",
          borderRadius: 14, padding: "16px 20px", color: "#fff",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.85, textTransform: "uppercase", letterSpacing: "0.06em" }}>Catálogo</div>
          <div style={{ fontSize: 32, fontWeight: 800, margin: "6px 0 4px" }}>{control.customProducts?.length || 0}</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>productos registrados</div>
        </div>
        <div style={{
          background: "linear-gradient(135deg,#3b82f6,#60a5fa)",
          borderRadius: 14, padding: "16px 20px", color: "#fff",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.85, textTransform: "uppercase", letterSpacing: "0.06em" }}>Nódulos activos</div>
          <div style={{ fontSize: 32, fontWeight: 800, margin: "6px 0 4px" }}>{control.strains.length}</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>cepas en planta</div>
        </div>
      </div>
    </div>
  );
}
