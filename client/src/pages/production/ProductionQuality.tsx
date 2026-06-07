import { type FormEvent, useMemo, useState } from "react";
import {
  getQualityLabel,
  getTypeLabel,
  type ProductionBatch,
  type QualityInput,
  type QualityStatus,
  useProductionControl,
} from "@/lib/productionControl";
import {
  AlertTriangle,
  Beaker,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FlaskConical,
  Package,
  PackageCheck,
  Search,
  ShieldCheck,
  ShieldX,
  Thermometer,
  Wheat,
  X,
} from "lucide-react";
import { toast } from "sonner";

// ─── Tipos de evaluación ───────────────────────────────────────────────────────

type EvalScope = "finished_product" | "raw_material";

interface QualityDraft {
  // Producto terminado
  finishedStatus: QualityStatus;
  finishedPh: number;
  finishedTemperature: number;
  finishedAcidity: number;
  finishedAspectColor: string;
  finishedOutputLiters: number;
  finishedApprovedBy: string;
  finishedNotes: string;
  // Materia prima
  rawStatus: QualityStatus;
  rawSupplier: string;
  rawLot: string;
  rawTemperature: number;
  rawAcidity: number;
  rawApprovedBy: string;
  rawNotes: string;
}

const DEFAULT_DRAFT: QualityDraft = {
  finishedStatus: "aprobado",
  finishedPh: 4.4,
  finishedTemperature: 22,
  finishedAcidity: 0,
  finishedAspectColor: "Blanco",
  finishedOutputLiters: 0,
  finishedApprovedBy: "Calidad",
  finishedNotes: "",
  rawStatus: "aprobado",
  rawSupplier: "",
  rawLot: "",
  rawTemperature: 4,
  rawAcidity: 0,
  rawApprovedBy: "Calidad",
  rawNotes: "",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function statusChip(status: QualityStatus) {
  const map: Record<QualityStatus, { bg: string; color: string; label: string }> = {
    aprobado:  { bg: "#f0fdf9", color: "#00a878", label: "Aprobado"  },
    rechazado: { bg: "#fff1f0", color: "#ef4444", label: "Rechazado" },
    pendiente: { bg: "#fffbeb", color: "#f59e0b", label: "Pendiente" },
  };
  return map[status] ?? map.pendiente;
}

function StatusBadge({ status }: { status: QualityStatus }) {
  const s = statusChip(status);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.color}40`,
    }}>
      {status === "aprobado" ? <Check style={{ width: 10, height: 10 }} /> :
       status === "rechazado" ? <X style={{ width: 10, height: 10 }} /> :
       <AlertTriangle style={{ width: 10, height: 10 }} />}
      {s.label}
    </span>
  );
}

// ─── Tarjeta de lote en calidad ───────────────────────────────────────────────

function QualityBatchCard({
  batch,
  onEvaluate,
}: {
  batch: ProductionBatch;
  onEvaluate: (batch: ProductionBatch, scope: EvalScope) => void;
}) {
  const finishedStatus: QualityStatus = batch.finalQuality?.status || "pendiente";
  const rawStatus: QualityStatus      = (batch.finalQuality?.rawMaterialStatus as QualityStatus) || "pendiente";

  return (
    <article style={{
      background: "#fff",
      border: "1px solid #e8ecf0",
      borderRadius: 14,
      boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
      overflow: "hidden",
    }}>
      {/* Top accent */}
      <div style={{ height: 3, background: batch.status === "rechazado" ? "#ef4444" : "linear-gradient(90deg,#00a878,#3dcdff)" }} />

      <div style={{ padding: "16px 20px" }}>
        {/* Lote header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "#e8fdf5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Beaker style={{ width: 18, height: 18, color: "#00a878" }} />
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: 16, color: "#1a1a2e" }}>{batch.batchNumber}</span>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 3 }}>
                <span style={{ fontSize: 11, color: "#616569" }}>{getTypeLabel(batch.type)} • {batch.operator}</span>
                {batch.orderRef && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#eff6ff", color: "#3b82f6", border: "1px solid #bfdbfe" }}>
                    {batch.orderRef}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#616569" }}>
            <Calendar style={{ width: 12, height: 12 }} />
            {batch.startDate}
          </div>
        </div>

        {/* Dos secciones: Producto Terminado + Materia Prima */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* Producto terminado */}
          <div style={{
            border: "1.5px solid #e8ecf0", borderRadius: 12, padding: "14px",
            background: finishedStatus === "aprobado" ? "#f9fffe" : finishedStatus === "rechazado" ? "#fff8f8" : "#fffdf0",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Package style={{ width: 14, height: 14, color: "#3b82f6" }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: "#313131", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Producto Terminado
                </span>
              </div>
              <StatusBadge status={finishedStatus} />
            </div>

            {batch.finalQuality && finishedStatus !== "pendiente" ? (
              <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", margin: 0 }}>
                {[
                  { label: "pH", value: batch.finalQuality.ph ?? "—" },
                  { label: "Temp.", value: batch.finalQuality.temperature ? `${batch.finalQuality.temperature}°C` : "—" },
                  { label: "Acidez", value: batch.finalQuality.acidity ?? "—" },
                  { label: "Aspecto", value: batch.finalQuality.aspectColor || "—" },
                  { label: "Salida", value: batch.finalQuality.outputLiters ? `${batch.finalQuality.outputLiters}L` : "—" },
                  { label: "Responsable", value: batch.finalQuality.approvedBy || "—" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt style={{ fontSize: 9, fontWeight: 700, color: "#adb5bd", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</dt>
                    <dd style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#313131" }}>{String(value)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: "#adb5bd", fontStyle: "italic" }}>Sin evaluación registrada</p>
            )}

            <button
              type="button"
              onClick={() => onEvaluate(batch, "finished_product")}
              style={{
                marginTop: 12, width: "100%",
                padding: "8px 0", borderRadius: 8, border: "1.5px solid",
                borderColor: finishedStatus === "aprobado" ? "#c6f1e1" : finishedStatus === "rechazado" ? "#fecaca" : "#fde68a",
                background: finishedStatus === "aprobado" ? "#e8fdf5" : finishedStatus === "rechazado" ? "#fff1f0" : "#fffbeb",
                color: finishedStatus === "aprobado" ? "#00a878" : finishedStatus === "rechazado" ? "#ef4444" : "#f59e0b",
                fontWeight: 700, fontSize: 12, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              }}
            >
              <FlaskConical style={{ width: 13, height: 13 }} />
              {finishedStatus === "pendiente" ? "Evaluar" : "Actualizar"}
            </button>
          </div>

          {/* Materia prima */}
          <div style={{
            border: "1.5px solid #e8ecf0", borderRadius: 12, padding: "14px",
            background: rawStatus === "aprobado" ? "#f9fffe" : rawStatus === "rechazado" ? "#fff8f8" : "#fffdf0",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Wheat style={{ width: 14, height: 14, color: "#f59e0b" }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: "#313131", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Materia Prima
                </span>
              </div>
              <StatusBadge status={rawStatus} />
            </div>

            {batch.finalQuality?.rawMaterialNotes || batch.finalQuality?.rawMaterialStatus ? (
              <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", margin: 0 }}>
                {[
                  { label: "Resultado", value: getQualityLabel(rawStatus) },
                  { label: "Tipo", value: batch.milkType || "—" },
                  { label: "Observación", value: batch.finalQuality?.rawMaterialNotes || "—" },
                ].map(({ label, value }) => (
                  <div key={label} style={{ gridColumn: label === "Observación" ? "1 / -1" : undefined }}>
                    <dt style={{ fontSize: 9, fontWeight: 700, color: "#adb5bd", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</dt>
                    <dd style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#313131" }}>{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: "#adb5bd", fontStyle: "italic" }}>Sin evaluación registrada</p>
            )}

            <button
              type="button"
              onClick={() => onEvaluate(batch, "raw_material")}
              style={{
                marginTop: 12, width: "100%",
                padding: "8px 0", borderRadius: 8, border: "1.5px solid",
                borderColor: rawStatus === "aprobado" ? "#c6f1e1" : rawStatus === "rechazado" ? "#fecaca" : "#fde68a",
                background: rawStatus === "aprobado" ? "#e8fdf5" : rawStatus === "rechazado" ? "#fff1f0" : "#fffbeb",
                color: rawStatus === "aprobado" ? "#00a878" : rawStatus === "rechazado" ? "#ef4444" : "#f59e0b",
                fontWeight: 700, fontSize: 12, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              }}
            >
              <Wheat style={{ width: 13, height: 13 }} />
              {rawStatus === "pendiente" ? "Evaluar" : "Actualizar"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

// ─── Modal de evaluación ───────────────────────────────────────────────────────

function EvalModal({
  batch,
  scope,
  draft,
  setDraft,
  onSave,
  onClose,
}: {
  batch: ProductionBatch;
  scope: EvalScope;
  draft: QualityDraft;
  setDraft: (d: QualityDraft) => void;
  onSave: (e: FormEvent) => void;
  onClose: () => void;
}) {
  const isFinished = scope === "finished_product";

  return (
    <div className="kefir-modal-overlay" role="dialog" aria-modal="true">
      <div className="kefir-modal">
        <div className="kefir-modal-header">
          <h2>
            {isFinished ? "Calidad de Producto Terminado" : "Calidad de Materia Prima"} — {batch.batchNumber}
          </h2>
          <button type="button" className="kefir-modal-close" onClick={onClose} aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="kefir-modal-body" onSubmit={onSave}>
          <div className="kefir-info-box is-green">
            {isFinished
              ? <Package className="h-6 w-6" />
              : <Wheat className="h-6 w-6" />}
            <div>
              <strong>{isFinished ? "Evaluación de Producto Terminado" : "Evaluación de Materia Prima"}</strong>
              <span className="block text-[12px] text-[#616569]">
                {isFinished
                  ? "Registra los parámetros fisicoquímicos del producto final."
                  : "Registra la conformidad de la materia prima recibida."}
              </span>
            </div>
          </div>

          {isFinished ? (
            <>
              <div className="kefir-quality-baseline">
                <div>
                  <span>Lote</span><strong>{batch.batchNumber}</strong>
                </div>
                <div>
                  <span>Tipo</span><strong>{getTypeLabel(batch.type)}</strong>
                </div>
                <div>
                  <span>Carga inicial</span><strong>{batch.initialVolumeLiters} L</strong>
                </div>
                <div>
                  <span>Rendimiento esperado</span>
                  <strong>{batch.expectedVolumeLiters || batch.expectedQuesoGr || "—"} {batch.expectedVolumeLiters ? "L" : "g"}</strong>
                </div>
              </div>

              <div className="kefir-form-grid is-three">
                <div className="kefir-field">
                  <label>pH final</label>
                  <input type="number" step="0.1" value={draft.finishedPh}
                    onChange={(e) => setDraft({ ...draft, finishedPh: Number(e.target.value) })} />
                </div>
                <div className="kefir-field">
                  <label>Temperatura (°C)</label>
                  <input type="number" step="0.1" value={draft.finishedTemperature}
                    onChange={(e) => setDraft({ ...draft, finishedTemperature: Number(e.target.value) })} />
                </div>
                <div className="kefir-field">
                  <label>Acidez</label>
                  <input type="number" step="0.01" value={draft.finishedAcidity}
                    onChange={(e) => setDraft({ ...draft, finishedAcidity: Number(e.target.value) })} />
                </div>
                <div className="kefir-field">
                  <label>Aspecto / Color</label>
                  <input value={draft.finishedAspectColor}
                    onChange={(e) => setDraft({ ...draft, finishedAspectColor: e.target.value })} />
                </div>
                <div className="kefir-field">
                  <label>Salida real (L)</label>
                  <input type="number" step="0.1" value={draft.finishedOutputLiters}
                    onChange={(e) => setDraft({ ...draft, finishedOutputLiters: Number(e.target.value) })} />
                </div>
                <div className="kefir-field">
                  <label>Responsable</label>
                  <input value={draft.finishedApprovedBy}
                    onChange={(e) => setDraft({ ...draft, finishedApprovedBy: e.target.value })} />
                </div>
              </div>

              <div className="kefir-quality-divider" />

              <div className="kefir-field">
                <label>Veredicto — Producto Terminado</label>
                <div className="kefir-verdict-group">
                  <button type="button"
                    className={`kefir-verdict ${draft.finishedStatus === "aprobado" ? "is-active" : ""}`}
                    onClick={() => setDraft({ ...draft, finishedStatus: "aprobado" })}>
                    <Check className="h-4 w-4" /> Aprobado para distribución
                  </button>
                  <button type="button"
                    className={`kefir-verdict is-reject ${draft.finishedStatus === "rechazado" ? "is-active" : ""}`}
                    onClick={() => setDraft({ ...draft, finishedStatus: "rechazado" })}>
                    <X className="h-4 w-4" /> Rechazado
                  </button>
                  <button type="button"
                    className={`kefir-verdict is-pending ${draft.finishedStatus === "pendiente" ? "is-active" : ""}`}
                    onClick={() => setDraft({ ...draft, finishedStatus: "pendiente" })}>
                    En observación
                  </button>
                </div>
              </div>

              <div className="kefir-field mt-3">
                <label>Observaciones</label>
                <textarea value={draft.finishedNotes}
                  onChange={(e) => setDraft({ ...draft, finishedNotes: e.target.value })} />
              </div>
            </>
          ) : (
            <>
              <div className="kefir-quality-baseline">
                <div>
                  <span>Lote</span><strong>{batch.batchNumber}</strong>
                </div>
                <div>
                  <span>Tipo de leche</span><strong>{batch.milkType || "N/A"}</strong>
                </div>
              </div>

              <div className="kefir-form-grid">
                <div className="kefir-field">
                  <label>Proveedor</label>
                  <input placeholder="Nombre del proveedor" value={draft.rawSupplier}
                    onChange={(e) => setDraft({ ...draft, rawSupplier: e.target.value })} />
                </div>
                <div className="kefir-field">
                  <label>Lote / Remisión</label>
                  <input placeholder="Número de lote proveedor" value={draft.rawLot}
                    onChange={(e) => setDraft({ ...draft, rawLot: e.target.value })} />
                </div>
                <div className="kefir-field">
                  <label>Temperatura recepción (°C)</label>
                  <input type="number" step="0.1" value={draft.rawTemperature}
                    onChange={(e) => setDraft({ ...draft, rawTemperature: Number(e.target.value) })} />
                </div>
                <div className="kefir-field">
                  <label>Acidez</label>
                  <input type="number" step="0.01" value={draft.rawAcidity}
                    onChange={(e) => setDraft({ ...draft, rawAcidity: Number(e.target.value) })} />
                </div>
                <div className="kefir-field">
                  <label>Responsable recepción</label>
                  <input value={draft.rawApprovedBy}
                    onChange={(e) => setDraft({ ...draft, rawApprovedBy: e.target.value })} />
                </div>
              </div>

              <div className="kefir-quality-divider" />

              <div className="kefir-field">
                <label>Veredicto — Materia Prima</label>
                <div className="kefir-verdict-group">
                  <button type="button"
                    className={`kefir-verdict ${draft.rawStatus === "aprobado" ? "is-active" : ""}`}
                    onClick={() => setDraft({ ...draft, rawStatus: "aprobado" })}>
                    <Check className="h-4 w-4" /> Aprobada para producción
                  </button>
                  <button type="button"
                    className={`kefir-verdict is-reject ${draft.rawStatus === "rechazado" ? "is-active" : ""}`}
                    onClick={() => setDraft({ ...draft, rawStatus: "rechazado" })}>
                    <X className="h-4 w-4" /> Rechazada
                  </button>
                  <button type="button"
                    className={`kefir-verdict is-pending ${draft.rawStatus === "pendiente" ? "is-active" : ""}`}
                    onClick={() => setDraft({ ...draft, rawStatus: "pendiente" })}>
                    En observación
                  </button>
                </div>
              </div>

              <div className="kefir-field mt-3">
                <label>Observaciones</label>
                <textarea value={draft.rawNotes}
                  onChange={(e) => setDraft({ ...draft, rawNotes: e.target.value })} />
              </div>
            </>
          )}

          <div className="kefir-modal-footer">
            <button type="button" className="kefir-btn is-soft" onClick={onClose}>Cancelar</button>
            <button type="submit"
              className={
                (isFinished ? draft.finishedStatus : draft.rawStatus) === "rechazado"
                  ? "kefir-btn is-danger"
                  : "kefir-btn is-green"
              }>
              Guardar Evaluación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Módulo principal ──────────────────────────────────────────────────────────

export default function ProductionQuality() {
  const control = useProductionControl();
  const [query, setQuery]           = useState("");
  const [qualityFilter, setFilter]  = useState<"todos" | QualityStatus>("todos");
  const [selected, setSelected]     = useState<{ batch: ProductionBatch; scope: EvalScope } | null>(null);
  const [draft, setDraft]           = useState<QualityDraft>(DEFAULT_DRAFT);

  // ── Estado para liberación final ──────────────────────────────────
  const [releaseOpen, setReleaseOpen]   = useState(false);
  const [releaseBatch, setReleaseBatch] = useState<ProductionBatch | null>(null);
  const [releaseDraft, setReleaseDraft] = useState({
    status:      "aprobado" as QualityStatus,
    ph:          4.4,
    temperature: 22,
    acidity:     0,
    aspectColor: "Blanco",
    outputLiters: 0,
    approvedBy:  "Calidad",
    notes:       "",
    expirationDate: "",
  });

  const enCalidadBatches = useMemo(
    () => control.batches.filter((b) => b.status === "en_calidad"),
    [control.batches]
  );

  const openRelease = (batch: ProductionBatch) => {
    setReleaseBatch(batch);
    setReleaseDraft({
      status:      batch.finalQuality?.status || "aprobado",
      ph:          batch.finalQuality?.ph || 4.4,
      temperature: batch.finalQuality?.temperature || 22,
      acidity:     batch.finalQuality?.acidity || 0,
      aspectColor: batch.finalQuality?.aspectColor || "Blanco",
      outputLiters: batch.finalQuality?.outputLiters || batch.finalVolumeLiters || batch.expectedVolumeLiters || 0,
      approvedBy:  batch.finalQuality?.approvedBy || "Calidad",
      notes:       batch.finalQuality?.notes || "",
      expirationDate: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().split("T")[0];
      })(),
    });
    setReleaseOpen(true);
  };

  const handleRelease = (e: FormEvent) => {
    e.preventDefault();
    if (!releaseBatch) return;
    const qi: QualityInput = {
      ...releaseDraft,
      stage: "final" as any,
      scope: "final" as any,
    };
    control.releaseToInventory(releaseBatch.id, qi);
    if (releaseDraft.status === "aprobado") {
      toast.success(`✅ Lote ${releaseBatch.batchNumber} liberado a inventario de producto terminado`);
    } else {
      toast.error(`❌ Lote ${releaseBatch.batchNumber} rechazado en calidad final`);
    }
    setReleaseOpen(false);
  };

  // KPIs globales (solo producto terminado)
  const finished = useMemo(() =>
    control.batches.map((b) => b.finalQuality?.status || "pendiente"),
    [control.batches]
  );
  const approvedCount  = finished.filter((s) => s === "aprobado").length;
  const pendingCount   = finished.filter((s) => s === "pendiente").length;
  const rejectedCount  = finished.filter((s) => s === "rechazado").length;
  const rawPendingCount = control.batches.filter(
    (b) => !b.finalQuality?.rawMaterialStatus || b.finalQuality?.rawMaterialStatus === "pendiente"
  ).length;

  // Filtros
  const filteredBatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return control.batches.filter((batch) => {
      const matchQ = !q || [batch.batchNumber, batch.operator, batch.orderRef, getTypeLabel(batch.type)]
        .join(" ").toLowerCase().includes(q);
      const matchF = qualityFilter === "todos" || (batch.finalQuality?.status || "pendiente") === qualityFilter;
      return matchQ && matchF;
    });
  }, [control.batches, qualityFilter, query]);

  const openEval = (batch: ProductionBatch, scope: EvalScope) => {
    const fq = batch.finalQuality;
    setDraft({
      finishedStatus:      (fq?.status as QualityStatus)              || "aprobado",
      finishedPh:          fq?.ph                                      || 4.4,
      finishedTemperature: fq?.temperature                             || 22,
      finishedAcidity:     fq?.acidity                                 || 0,
      finishedAspectColor: fq?.aspectColor                             || "Blanco",
      finishedOutputLiters: fq?.outputLiters || batch.finalVolumeLiters || batch.expectedVolumeLiters || 0,
      finishedApprovedBy:  fq?.approvedBy                              || "Calidad",
      finishedNotes:       fq?.notes                                   || "",
      rawStatus:           (fq?.rawMaterialStatus as QualityStatus)    || "aprobado",
      rawSupplier:         "",
      rawLot:              "",
      rawTemperature:      4,
      rawAcidity:          0,
      rawApprovedBy:       fq?.approvedBy                              || "Calidad",
      rawNotes:            fq?.rawMaterialNotes                        || "",
    });
    setSelected({ batch, scope });
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const { batch, scope } = selected;

    if (scope === "finished_product") {
      control.recordQuality(batch.id, {
        status:           draft.finishedStatus,
        ph:               draft.finishedPh,
        temperature:      draft.finishedTemperature,
        acidity:          draft.finishedAcidity,
        aspectColor:      draft.finishedAspectColor,
        outputLiters:     draft.finishedOutputLiters,
        approvedBy:       draft.finishedApprovedBy,
        notes:            draft.finishedNotes,
        rawMaterialStatus: draft.rawStatus,
        rawMaterialNotes:  draft.rawNotes,
        stage:             "final",
        scope:             "final",
      });
      toast.success(`Calidad de producto terminado registrada para ${batch.batchNumber}`);
    } else {
      control.recordQuality(batch.id, {
        status:            batch.finalQuality?.status || "pendiente",
        rawMaterialStatus: draft.rawStatus,
        rawMaterialNotes:  `${draft.rawNotes}${draft.rawSupplier ? ` | Prov: ${draft.rawSupplier}` : ""}${draft.rawLot ? ` | Lote: ${draft.rawLot}` : ""}`,
        approvedBy:        draft.rawApprovedBy,
        temperature:       draft.rawTemperature,
        acidity:           draft.rawAcidity,
        notes:             batch.finalQuality?.notes || "",
        stage:             "final",
        scope:             "final",
      });
      toast.success(`Calidad de materia prima registrada para ${batch.batchNumber}`);
    }
    setSelected(null);
  };

  return (
    <div className="kefir-page">

      {/* ── PANEL PRIORITARIO: Lotes en espera de Calidad final ───── */}
      {enCalidadBatches.length > 0 && (
        <section style={{
          marginBottom: 24,
          border: "2px solid #06b6d4",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(6,182,212,0.15)",
        }}>
          <div style={{
            background: "linear-gradient(135deg,#06b6d4,#0891b2)",
            padding: "16px 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <PackageCheck style={{ width: 22, height: 22, color: "#fff", flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#fff" }}>Liberación a Inventario</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>
                  {enCalidadBatches.length} lote{enCalidadBatches.length > 1 ? "s" : ""} pendiente{enCalidadBatches.length > 1 ? "s" : ""} de evaluación final
                </div>
              </div>
            </div>
            <span style={{ background: "rgba(255,255,255,0.25)", color: "#fff", fontWeight: 800, fontSize: 14, padding: "4px 12px", borderRadius: 20 }}>
              {enCalidadBatches.length} pendiente{enCalidadBatches.length > 1 ? "s" : ""}
            </span>
          </div>

          <div style={{ padding: 16, background: "#f7feff", display: "flex", flexDirection: "column", gap: 10 }}>
            {enCalidadBatches.map((batch) => (
              <div key={batch.id} style={{
                background: "#fff",
                border: "1.5px solid #e0f7ff",
                borderRadius: 13,
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: "#ecfeff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ShieldCheck style={{ width: 20, height: 20, color: "#06b6d4" }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#1a1a2e" }}>{batch.batchNumber}</div>
                    <div style={{ fontSize: 11, color: "#616569", marginTop: 1 }}>{getTypeLabel(batch.type)} • {batch.operator}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#f0f9ff", color: "#0891b2", border: "1px solid #bae6fd" }}>
                        Entrada: {batch.initialVolumeLiters}L
                      </span>
                      {batch.finalUnits > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#f0fdf9", color: "#00a878", border: "1px solid #c6f1e1" }}>
                          {batch.finalUnits} und. producidas
                        </span>
                      )}
                      {batch.finalVolumeLiters > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#f0fdf9", color: "#00a878", border: "1px solid #c6f1e1" }}>
                          {batch.finalVolumeLiters}L finales
                        </span>
                      )}
                      {batch.orderRef && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#faf5ff", color: "#8b5cf6", border: "1px solid #ddd6fe" }}>
                          {batch.orderRef}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button type="button" onClick={() => openRelease(batch)} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "10px 18px", borderRadius: 10, border: "none", cursor: "pointer",
                    background: "linear-gradient(135deg,#00a878,#059669)",
                    color: "#fff", fontWeight: 700, fontSize: 13,
                    boxShadow: "0 4px 14px rgba(0,168,120,0.35)",
                  }}>
                    <PackageCheck style={{ width: 15, height: 15 }} />
                    Evaluar → Inventario
                  </button>
                  <button type="button" onClick={() => { control.releaseToInventory(batch.id, { status: "rechazado", stage: "final" as any, scope: "final" as any }); toast.error(`Lote ${batch.batchNumber} rechazado`); }} style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "10px 14px", borderRadius: 10,
                    border: "1.5px solid #fecaca", background: "#fff",
                    color: "#ef4444", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  }}>
                    <ShieldX style={{ width: 15, height: 15 }} />
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* KPIs */}
      <div className="kefir-metrics">
        <div className="kefir-stat-card is-green">
          <span className="kefir-stat-icon"><CheckCircle2 className="h-5 w-5" /></span>
          <span>
            <span className="kefir-stat-value">{approvedCount}</span>
            <span className="kefir-stat-label">Prod. Terminado Aprobado</span>
          </span>
        </div>
        <div className="kefir-stat-card is-blue">
          <span className="kefir-stat-icon"><ClipboardCheck className="h-5 w-5" /></span>
          <span>
            <span className="kefir-stat-value">{pendingCount}</span>
            <span className="kefir-stat-label">Evaluación Pendiente</span>
          </span>
        </div>
        <div className="kefir-stat-card is-red">
          <span className="kefir-stat-icon"><AlertTriangle className="h-5 w-5" /></span>
          <span>
            <span className="kefir-stat-value">{rejectedCount}</span>
            <span className="kefir-stat-label">Rechazados</span>
          </span>
        </div>
        <div className="kefir-stat-card is-orange">
          <span className="kefir-stat-icon"><ShieldCheck className="h-5 w-5" /></span>
          <span>
            <span className="kefir-stat-value">{rawPendingCount}</span>
            <span className="kefir-stat-label">Mat. Prima Pendiente</span>
          </span>
        </div>
      </div>

      {/* Info banner */}
      <div style={{
        margin: "0 0 20px",
        padding: "12px 18px",
        borderRadius: 12,
        background: "#f0fdf9",
        border: "1.5px solid #c6f1e1",
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontSize: 13,
        color: "#00a878",
        fontWeight: 600,
      }}>
        <Thermometer style={{ width: 18, height: 18, flexShrink: 0 }} />
        <span>
          Este módulo evalúa la <b>calidad del producto terminado</b> y la <b>calidad de materia prima</b>.
          La calidad por etapas se registra en el módulo de <b>Lotes</b> con el botón "⚗ Calidad".
        </span>
      </div>

      {/* Toolbar */}
      <div className="kefir-toolbar">
        <div className="kefir-toolbar-left">
          <div className="kefir-search">
            <Search className="h-4 w-4" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar lote, operador, orden..."
            />
          </div>
          <div className="kefir-tabs">
            {[
              { value: "todos",     label: "Todos" },
              { value: "pendiente", label: "Pendiente" },
              { value: "aprobado",  label: "Aprobado"  },
              { value: "rechazado", label: "Rechazado" },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                className={`kefir-tab ${qualityFilter === item.value ? "is-active" : ""}`}
                onClick={() => setFilter(item.value as typeof qualityFilter)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de lotes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filteredBatches.length > 0 ? (
          filteredBatches.map((batch) => (
            <QualityBatchCard key={batch.id} batch={batch} onEvaluate={openEval} />
          ))
        ) : (
          <div className="kefir-empty">No hay lotes para los filtros seleccionados.</div>
        )}
      </div>

      {/* Modal de Evaluación General */}
      {selected && (
        <EvalModal
          batch={selected.batch}
          scope={selected.scope}
          draft={draft}
          setDraft={setDraft}
          onSave={handleSave}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Modal de Liberación a Inventario */}
      {releaseOpen && releaseBatch && (
        <div className="kefir-modal-overlay" role="dialog" aria-modal="true">
          <div className="kefir-modal">
            <div className="kefir-modal-header">
              <h2>Evaluación Final — {releaseBatch.batchNumber}</h2>
              <button type="button" className="kefir-modal-close" onClick={() => setReleaseOpen(false)} aria-label="Cerrar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form className="kefir-modal-body" onSubmit={handleRelease}>
              <div style={{
                padding: "12px 16px", borderRadius: 10, marginBottom: 18,
                background: "linear-gradient(135deg,#ecfeff,#f0f9ff)",
                border: "1.5px solid #06b6d4",
                display: "flex", alignItems: "flex-start", gap: 10,
              }}>
                <PackageCheck style={{ width: 22, height: 22, color: "#06b6d4", flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: "#06b6d4" }}>Control de Calidad Final</div>
                  <div style={{ fontSize: 11, color: "#616569", marginTop: 2 }}>
                    {getTypeLabel(releaseBatch.type)} • {releaseBatch.operator}<br />
                    Entrada: <b>{releaseBatch.initialVolumeLiters}L</b> •
                    Producción: <b>{releaseBatch.finalUnits} und</b>
                    {releaseBatch.finalVolumeLiters > 0 && ` • ${releaseBatch.finalVolumeLiters}L`}
                    {releaseBatch.finalQuesoGr > 0 && ` • ${releaseBatch.finalQuesoGr}g queso`}
                  </div>
                </div>
              </div>

              <div className="kefir-form-grid">
                <div className="kefir-field">
                  <label>pH final</label>
                  <input type="number" step="0.1" value={releaseDraft.ph}
                    onChange={e => setReleaseDraft({ ...releaseDraft, ph: Number(e.target.value) })} />
                </div>
                <div className="kefir-field">
                  <label>Temperatura (°C)</label>
                  <input type="number" step="0.1" value={releaseDraft.temperature}
                    onChange={e => setReleaseDraft({ ...releaseDraft, temperature: Number(e.target.value) })} />
                </div>
                <div className="kefir-field">
                  <label>Acidez</label>
                  <input type="number" step="0.01" value={releaseDraft.acidity}
                    onChange={e => setReleaseDraft({ ...releaseDraft, acidity: Number(e.target.value) })} />
                </div>
                <div className="kefir-field">
                  <label>Aspecto / Color</label>
                  <input value={releaseDraft.aspectColor}
                    onChange={e => setReleaseDraft({ ...releaseDraft, aspectColor: e.target.value })} />
                </div>
                <div className="kefir-field">
                  <label>Salida final (L / g)</label>
                  <input type="number" step="0.1" value={releaseDraft.outputLiters}
                    onChange={e => setReleaseDraft({ ...releaseDraft, outputLiters: Number(e.target.value) })} />
                </div>
                <div className="kefir-field">
                  <label>Responsable</label>
                  <input value={releaseDraft.approvedBy}
                    onChange={e => setReleaseDraft({ ...releaseDraft, approvedBy: e.target.value })} />
                </div>
                <div className="kefir-field" style={{ gridColumn: "1 / -1" }}>
                  <label>Fecha de Vencimiento Lote (FEFO)</label>
                  <input type="date" value={releaseDraft.expirationDate}
                    onChange={e => setReleaseDraft({ ...releaseDraft, expirationDate: e.target.value })} 
                    style={{ fontWeight: "bold", color: "#00a878", border: "1.5px solid #c6f1e1", background: "#f0fdf9" }}
                  />
                  <div style={{ fontSize: 10, color: "#616569", marginTop: 4 }}>* Por defecto +30 días. Puedes ajustar según el tipo de producto.</div>
                </div>
              </div>

              <div className="kefir-quality-divider" />
              <div className="kefir-field">
                <label>Veredicto final</label>
                <div className="kefir-verdict-group">
                  <button type="button"
                    className={`kefir-verdict ${releaseDraft.status === "aprobado" ? "is-active" : ""}`}
                    onClick={() => setReleaseDraft({ ...releaseDraft, status: "aprobado" })}>
                    <Check className="h-4 w-4" /> Aprobado → Inventario
                  </button>
                  <button type="button"
                    className={`kefir-verdict is-reject ${releaseDraft.status === "rechazado" ? "is-active" : ""}`}
                    onClick={() => setReleaseDraft({ ...releaseDraft, status: "rechazado" })}>
                    <X className="h-4 w-4" /> Rechazar
                  </button>
                </div>
              </div>
              <div className="kefir-field mt-3">
                <label>Observaciones</label>
                <textarea value={releaseDraft.notes}
                  onChange={e => setReleaseDraft({ ...releaseDraft, notes: e.target.value })} />
              </div>

              <div className="kefir-modal-footer">
                <button type="button" className="kefir-btn is-soft" onClick={() => setReleaseOpen(false)}>Cancelar</button>
                <button type="submit" className="kefir-btn is-green">
                  <PackageCheck className="h-4 w-4" />
                  {releaseDraft.status === "aprobado" ? "Liberar a Inventario" : "Rechazar Lote"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
