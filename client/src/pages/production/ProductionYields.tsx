import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getTypeLabel, type ProductionFactors, useProductionControl } from "@/lib/productionControl";
import { BookOpen, Calculator, Clock, FlaskConical, Save } from "lucide-react";
import { toast } from "sonner";

// ─── Tipos de proceso ──────────────────────────────────────────────────────────

type ProcessKey =
  | "queso_directo"
  | "queso_indirecto"
  | "kefir_leche"
  | "kefir_agua";

type KnownDataKey = "insumo" | "produccion_queso" | "coproducto_suero";

interface CalcResult {
  liquidoBase: number;       // L
  produccionQueso: number;   // g
  coproductoSuero: number;   // ml
  insumoNodulos: number;     // g (100 g/10L default)
}

// ─── Utilidades de cálculo ─────────────────────────────────────────────────────

const NODULO_GR_PER_LITER = 100; // 100 g de nódulos por litro de leche

function calcFromLiquidoBase(
  process: ProcessKey,
  liquidoL: number,
  factors: ProductionFactors
): CalcResult {
  let quesoGr = 0;
  let sueroMl = 0;

  if (process === "queso_directo") {
    quesoGr = liquidoL * factors.cheeseDirectGrPerLiter;
    sueroMl = liquidoL * factors.cheeseDirectWheyMlPerLiter;
  } else if (process === "queso_indirecto") {
    quesoGr = liquidoL * factors.cheeseIndirectGrPerLiter;
    sueroMl = liquidoL * factors.cheeseIndirectWheyMlPerLiter;
  } else if (process === "kefir_leche") {
    quesoGr = liquidoL * (factors.kefirYieldPct / 100) * 1000;
    sueroMl = liquidoL * ((100 - factors.kefirYieldPct) / 100) * 1000;
  } else {
    quesoGr = liquidoL * (factors.kefirWaterYieldPct / 100) * 1000;
    sueroMl = liquidoL * ((100 - factors.kefirWaterYieldPct) / 100) * 1000;
  }

  return {
    liquidoBase: liquidoL,
    produccionQueso: quesoGr,
    coproductoSuero: sueroMl,
    insumoNodulos: liquidoL * NODULO_GR_PER_LITER,
  };
}

function calcFromQuesoGr(
  process: ProcessKey,
  quesoGr: number,
  factors: ProductionFactors
): CalcResult {
  let grPerLiter = 1;

  if (process === "queso_directo") grPerLiter = factors.cheeseDirectGrPerLiter;
  else if (process === "queso_indirecto") grPerLiter = factors.cheeseIndirectGrPerLiter;
  else if (process === "kefir_leche") grPerLiter = (factors.kefirYieldPct / 100) * 1000;
  else grPerLiter = (factors.kefirWaterYieldPct / 100) * 1000;

  const liquidoL = grPerLiter > 0 ? quesoGr / grPerLiter : 0;
  return calcFromLiquidoBase(process, liquidoL, factors);
}

function calcFromSueroMl(
  process: ProcessKey,
  sueroMl: number,
  factors: ProductionFactors
): CalcResult {
  let mlPerLiter = 1;

  if (process === "queso_directo") mlPerLiter = factors.cheeseDirectWheyMlPerLiter;
  else if (process === "queso_indirecto") mlPerLiter = factors.cheeseIndirectWheyMlPerLiter;
  else if (process === "kefir_leche") mlPerLiter = ((100 - factors.kefirYieldPct) / 100) * 1000;
  else mlPerLiter = ((100 - factors.kefirWaterYieldPct) / 100) * 1000;

  const liquidoL = mlPerLiter > 0 ? sueroMl / mlPerLiter : 0;
  return calcFromLiquidoBase(process, liquidoL, factors);
}

function runCalc(
  process: ProcessKey,
  knownData: KnownDataKey,
  amount: number,
  factors: ProductionFactors
): CalcResult | null {
  if (!amount || amount <= 0) return null;

  if (knownData === "insumo") return calcFromLiquidoBase(process, amount, factors);
  if (knownData === "produccion_queso") return calcFromQuesoGr(process, amount, factors);
  if (knownData === "coproducto_suero") return calcFromSueroMl(process, amount, factors);
  return null;
}

// ─── Opciones de selectores ────────────────────────────────────────────────────

const PROCESS_OPTIONS: { value: ProcessKey; label: string }[] = [
  { value: "queso_directo", label: "Queso Directo (desde leche)" },
  { value: "queso_indirecto", label: "Queso Indirecto (desde kefir)" },
  { value: "kefir_leche", label: "Kéfir de Leche" },
  { value: "kefir_agua", label: "Kéfir de Agua" },
];

const KNOWN_DATA_OPTIONS: { value: KnownDataKey; label: string; unit: string }[] = [
  { value: "insumo", label: "Tengo el Insumo (Líquido base)", unit: "Litros" },
  { value: "produccion_queso", label: "Tengo la Producción (Queso/Kéfir)", unit: "Gramos" },
  { value: "coproducto_suero", label: "Tengo el Co-producto (Suero)", unit: "ml" },
];

// ─── Componentes de tarjeta de resultado ──────────────────────────────────────

function ResultCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: "blue" | "yellow" | "green" | "purple";
}) {
  const colorMap = {
    blue: { border: "border-l-blue-500", badge: "bg-blue-50 text-blue-600 border-blue-200" },
    yellow: { border: "border-l-yellow-500", badge: "bg-yellow-50 text-yellow-600 border-yellow-200" },
    green: { border: "border-l-green-500", badge: "bg-green-50 text-green-600 border-green-200" },
    purple: { border: "border-l-purple-500", badge: "bg-purple-50 text-purple-600 border-purple-200" },
  };

  const formatted =
    value >= 1000
      ? value.toLocaleString("es-BO", { maximumFractionDigits: 0 })
      : value.toFixed(2);

  return (
    <div className={`flex-1 min-w-[180px] rounded-xl border bg-white shadow-sm border-l-4 ${colorMap[color].border} p-4`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </p>
      <p className="text-3xl font-bold text-foreground">
        {formatted}{" "}
        <span className={`text-sm font-semibold px-2 py-0.5 rounded-full border ${colorMap[color].badge}`}>
          {unit}
        </span>
      </p>
    </div>
  );
}

// ─── Tab: Calculadora de Producción ───────────────────────────────────────────

function CalculadoraTab({ factors }: { factors: ProductionFactors }) {
  const [process, setProcess] = useState<ProcessKey>("queso_directo");
  const [knownData, setKnownData] = useState<KnownDataKey>("insumo");
  const [amount, setAmount] = useState<string>("10");
  const [result, setResult] = useState<CalcResult | null>(() =>
    runCalc("queso_directo", "insumo", 10, factors)
  );

  const selectedKnownOption = KNOWN_DATA_OPTIONS.find((o) => o.value === knownData)!;

  const handleCalc = () => {
    const num = parseFloat(amount);
    const res = runCalc(process, knownData, num, factors);
    setResult(res);
    if (!res) toast.error("Ingresa una cantidad válida mayor a 0");
  };

  const handleSaveFactor = () => {
    toast.success("Factor guardado en el historial");
  };

  return (
    <div className="space-y-5">
      {/* Formulario */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        {/* Proceso */}
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Proceso a calcular
          </Label>
          <select
            value={process}
            onChange={(e) => {
              setProcess(e.target.value as ProcessKey);
              setResult(null);
            }}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {PROCESS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Dato conocido */}
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            ¿Qué dato tienes?
          </Label>
          <select
            value={knownData}
            onChange={(e) => {
              setKnownData(e.target.value as KnownDataKey);
              setResult(null);
            }}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {KNOWN_DATA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Cantidad */}
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Cantidad ({selectedKnownOption.unit})
          </Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCalc()}
              placeholder="0"
            />
            <Button onClick={handleCalc} className="shrink-0 gap-1.5">
              <Calculator className="h-4 w-4" />
              Calcular
            </Button>
          </div>
        </div>
      </div>

      {/* Resultados */}
      {result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-blue-600">Resultados del Cálculo:</p>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleSaveFactor}>
              <Save className="h-3.5 w-3.5" />
              Guardar Nuevo Factor
            </Button>
          </div>

          <div className="flex flex-wrap gap-3">
            <ResultCard
              label="Requerimiento: Líquido Base"
              value={result.liquidoBase}
              unit="L"
              color="blue"
            />
            <ResultCard
              label="Producción: Queso"
              value={result.produccionQueso}
              unit="g"
              color="yellow"
            />
            <ResultCard
              label="Co-producto: Suero"
              value={result.coproductoSuero}
              unit="ml"
              color="green"
            />
            <ResultCard
              label="Insumo: Nódulos / Granos"
              value={result.insumoNodulos}
              unit="g"
              color="purple"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Configurar Factores (BOM) ───────────────────────────────────────────

function FactoresTab({
  factors,
  onSave,
}: {
  factors: ProductionFactors;
  onSave: (f: ProductionFactors) => void;
}) {
  const [draft, setDraft] = useState<ProductionFactors>(factors);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    onSave(draft);
    toast.success("Factores de producción (BOM) actualizados");
  };

  const Field = ({
    label,
    description,
    field,
    unit,
  }: {
    label: string;
    description?: string;
    field: keyof ProductionFactors;
    unit: string;
  }) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-foreground">{label}</Label>
      {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={draft[field]}
          onChange={(e) => setDraft({ ...draft, [field]: Number(e.target.value) })}
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap">{unit}</span>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSave}>
      <div className="grid gap-6">
        {/* Sección Queso */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-5 w-1 rounded-full bg-yellow-500" />
            <h3 className="text-sm font-bold">Queso Directo (desde leche)</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-3">
            <Field
              label="Queso producido"
              description="Gramos de queso por litro de leche"
              field="cheeseDirectGrPerLiter"
              unit="g / L"
            />
            <Field
              label="Suero generado"
              description="Mililitros de suero por litro de leche"
              field="cheeseDirectWheyMlPerLiter"
              unit="ml / L"
            />
          </div>
        </div>

        <div className="border-t" />

        {/* Sección Queso indirecto */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-5 w-1 rounded-full bg-orange-500" />
            <h3 className="text-sm font-bold">Queso Indirecto (desde kéfir)</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-3">
            <Field
              label="Queso producido"
              description="Gramos de queso por litro de kéfir"
              field="cheeseIndirectGrPerLiter"
              unit="g / L"
            />
            <Field
              label="Suero generado"
              description="Mililitros de suero por litro de kéfir"
              field="cheeseIndirectWheyMlPerLiter"
              unit="ml / L"
            />
          </div>
        </div>

        <div className="border-t" />

        {/* Sección Kéfir */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-5 w-1 rounded-full bg-blue-500" />
            <h3 className="text-sm font-bold">Kéfir de Leche / Kéfir de Agua</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-3">
            <Field
              label="Rendimiento kéfir de leche"
              description="Porcentaje de conversión leche → kéfir"
              field="kefirYieldPct"
              unit="%"
            />
            <Field
              label="Rendimiento kéfir de agua"
              description="Porcentaje de conversión agua → kéfir"
              field="kefirWaterYieldPct"
              unit="%"
            />
          </div>
        </div>

        <Button type="submit" className="w-full sm:w-auto gap-2">
          <Save className="h-4 w-4" />
          Guardar Factores (BOM)
        </Button>
      </div>
    </form>
  );
}

// ─── Tab: Historial de Rendimientos ───────────────────────────────────────────

function HistorialTab({ control }: { control: ReturnType<typeof useProductionControl> }) {
  const records = control.yieldRecords;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Rendimiento promedio</p>
          <p className="text-2xl font-bold">
            {records.length > 0
              ? Math.round(records.reduce((s, r) => s + r.yieldPct, 0) / records.length)
              : 0}
            %
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Merma promedio</p>
          <p className="text-2xl font-bold text-red-600">
            {records.length > 0
              ? Math.round(records.reduce((s, r) => s + r.wastePct, 0) / records.length)
              : 0}
            %
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Unidades cerradas</p>
          <p className="text-2xl font-bold">
            {records.reduce((s, r) => s + r.outputUnits, 0)}
          </p>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Lote</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Entrada (L)</TableHead>
              <TableHead className="text-right">Salida</TableHead>
              <TableHead className="text-right">Rendimiento</TableHead>
              <TableHead className="text-right">Merma</TableHead>
              <TableHead className="text-right">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length > 0 ? (
              records.map((record) => (
                <TableRow key={record.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="font-bold font-mono text-sm">{record.batchNumber}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary">
                      {getTypeLabel(record.type)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{record.inputLiters}</TableCell>
                  <TableCell className="text-right">
                    {record.outputUnits} unid.
                    {record.outputCheeseGr > 0 ? ` / ${record.outputCheeseGr} g` : ""}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-bold text-green-700">{record.yieldPct}%</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-bold text-red-600">{record.wastePct}%</span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-xs">
                    {new Date(record.date).toLocaleDateString("es-BO")}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <FlaskConical className="h-8 w-8 text-muted-foreground/30" />
                    <span>Finalice un lote para registrar el primer rendimiento.</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────

type Tab = "calculadora" | "factores" | "historial";

const TABS: { key: Tab; label: string; icon: typeof Calculator }[] = [
  { key: "calculadora", label: "Calculadora de Producción", icon: Calculator },
  { key: "factores", label: "Configurar Factores (BOM)", icon: BookOpen },
  { key: "historial", label: "Historial de Rendimientos", icon: Clock },
];

export default function ProductionYields() {
  const control = useProductionControl();
  const [activeTab, setActiveTab] = useState<Tab>("calculadora");

  const activeBatches = control.batches?.filter((b) => b.status === "en_proceso").length ?? 0;

  return (
    <div className="p-4 space-y-5 md:p-6 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold md:text-3xl">Rendimientos de Producción</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toISOString().slice(0, 10)} · {activeBatches} lote{activeBatches !== 1 ? "s" : ""} activo{activeBatches !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Card contenedor */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Rendimientos y Conversiones</CardTitle>
          <CardDescription>
            Gestiona los factores de producción y calcula requerimientos de insumos.
          </CardDescription>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 pt-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent>
          {activeTab === "calculadora" && <CalculadoraTab factors={control.factors} />}
          {activeTab === "factores" && (
            <FactoresTab factors={control.factors} onSave={control.updateFactors} />
          )}
          {activeTab === "historial" && <HistorialTab control={control} />}
        </CardContent>
      </Card>
    </div>
  );
}
