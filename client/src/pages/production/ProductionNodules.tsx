import { type FormEvent, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type ProductionStrain, useProductionControl } from "@/lib/productionControl";
import { Microscope, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

type StrainFilter = "todas" | "leche" | "agua";

const healthClass = (health: string) => {
  if (health === "excelente") return "bg-green-50 text-green-700 border-green-200";
  if (health === "bueno") return "bg-blue-50 text-blue-700 border-blue-200";
  if (health === "observacion") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

export default function ProductionNodules() {
  const control = useProductionControl();
  const [filter, setFilter] = useState<StrainFilter>("todas");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Omit<ProductionStrain, "id" | "usageCount">>({
    name: "",
    type: "leche",
    currentWeightGr: 0,
    health: "bueno",
    notes: "",
  });

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) {
      toast.error("Ingrese el nombre de la cepa");
      return;
    }
    control.addStrain(draft);
    toast.success("Cepa registrada");
    setOpen(false);
    setDraft({ name: "", type: "leche", currentWeightGr: 0, health: "bueno", notes: "" });
  };

  const changeWeight = (strain: ProductionStrain, delta: number) => {
    const currentWeightGr = Math.max(0, Number((strain.currentWeightGr + delta).toFixed(1)));
    control.updateStrain(strain.id, { currentWeightGr });
  };

  const totalWeight = control.strains.reduce((sum, strain) => sum + strain.currentWeightGr, 0);
  const filteredStrains = control.strains.filter((strain) => filter === "todas" || strain.type === filter);

  return (
    <div className="p-4 space-y-5 md:p-6 md:space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold md:text-3xl">Gestion de Nodulos</h1>
          <p className="text-sm text-muted-foreground md:text-base">Control de cepas, salud, peso disponible y uso por lote.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Cepa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar cepa</DialogTitle>
              <DialogDescription>Agregue nodulos de leche o tibicos para asignarlos a lotes.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={draft.type} onValueChange={(value) => setDraft({ ...draft, type: value as "leche" | "agua" })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leche">Leche</SelectItem>
                      <SelectItem value="agua">Agua</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Peso g</Label>
                  <Input
                    type="number"
                    value={draft.currentWeightGr}
                    onChange={(event) => setDraft({ ...draft, currentWeightGr: Number(event.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Salud</Label>
                  <Select value={draft.health} onValueChange={(value) => setDraft({ ...draft, health: value as ProductionStrain["health"] })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excelente">Excelente</SelectItem>
                      <SelectItem value="bueno">Bueno</SelectItem>
                      <SelectItem value="observacion">Observacion</SelectItem>
                      <SelectItem value="reposo">Reposo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full">
                  Guardar cepa
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-3 md:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cepas activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{control.strains.length}</div>
            <p className="text-xs text-muted-foreground">Leche y agua</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Peso total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalWeight.toFixed(1)} g</div>
            <p className="text-xs text-muted-foreground">Disponible registrado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En observacion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{control.strains.filter((strain) => strain.health === "observacion").length}</div>
            <p className="text-xs text-muted-foreground">Revisar mantenimiento</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Microscope className="h-5 w-5" />
            Cepas registradas
          </CardTitle>
          <CardDescription>Los lotes descuentan una merma minima y aumentan el contador de uso.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 rounded-lg border bg-white p-2">
            {[
              { value: "todas", label: "Todas", count: control.strains.length },
              { value: "leche", label: "Leche", count: control.strains.filter((strain) => strain.type === "leche").length },
              { value: "agua", label: "Agua", count: control.strains.filter((strain) => strain.type === "agua").length },
            ].map((item) => (
              <Button
                key={item.value}
                type="button"
                variant={filter === item.value ? "default" : "outline"}
                className="gap-2"
                onClick={() => setFilter(item.value as StrainFilter)}
              >
                {item.label}
                <Badge variant="secondary" className="bg-white/70 text-foreground">
                  {item.count}
                </Badge>
              </Button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredStrains.map((strain) => (
              <Card key={strain.id} className="border-muted">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{strain.name}</CardTitle>
                      <CardDescription>{strain.type === "agua" ? "Tibicos" : "Nodulos de leche"}</CardDescription>
                    </div>
                    <Badge variant="outline" className={healthClass(strain.health)}>
                      {strain.health}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs text-muted-foreground">Peso</p>
                      <p className="text-lg font-bold">{strain.currentWeightGr} g</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs text-muted-foreground">Usos</p>
                      <p className="text-lg font-bold">{strain.usageCount}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-[48px_1fr_48px] overflow-hidden rounded-lg border bg-white">
                    <Button variant="ghost" size="icon" className="rounded-none" onClick={() => changeWeight(strain, -10)}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={strain.currentWeightGr}
                      onChange={(event) => control.updateStrain(strain.id, { currentWeightGr: Number(event.target.value) })}
                      className="border-0 text-center font-bold shadow-none focus-visible:ring-0"
                    />
                    <Button variant="ghost" size="icon" className="rounded-none" onClick={() => changeWeight(strain, 10)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Salud</Label>
                    <Select
                      value={strain.health}
                      onValueChange={(value) => control.updateStrain(strain.id, { health: value as ProductionStrain["health"] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excelente">Excelente</SelectItem>
                        <SelectItem value="bueno">Bueno</SelectItem>
                        <SelectItem value="observacion">Observacion</SelectItem>
                        <SelectItem value="reposo">Reposo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {strain.lastUsed && <p className="text-xs text-muted-foreground">Ultimo uso: {strain.lastUsed}</p>}
                  {strain.notes && <p className="text-xs text-muted-foreground">{strain.notes}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
