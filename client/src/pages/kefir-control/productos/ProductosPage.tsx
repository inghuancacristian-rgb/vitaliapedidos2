import { trpc } from "@/lib/trpc";
import { PRODUCT_LIST_QUERY_OPTIONS } from "@/lib/production";
import KefirControlLayout from "@/pages/kefir-control/_shared/KefirControlLayout";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function KefirControlProductosPage() {
  const { data: allProducts = [], isLoading } =
    trpc.inventory.listProducts.useQuery(undefined, PRODUCT_LIST_QUERY_OPTIONS);

  // Filtrar productos de producción (finished_product o raw_material)
  const productionProducts = allProducts.filter(
    (p: any) =>
      p.category === "finished_product" ||
      p.category === "raw_material" ||
      p.category === "supplies" ||
      p.productionRole === "finished_good" ||
      p.productionRole === "milk" ||
      p.productionRole === "sugar" ||
      p.productionRole === "packaging"
  );

  const getCategoryLabel = (category: string | null | undefined) => {
    switch (category) {
      case "finished_product":
        return "Producto Terminado";
      case "raw_material":
        return "Materia Prima";
      case "supplies":
        return "Insumos";
      default:
        return category || "Sin categoría";
    }
  };

  const getCategoryColor = (category: string | null | undefined) => {
    switch (category) {
      case "finished_product":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "raw_material":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "supplies":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <KefirControlLayout
      title="Productos de Producción"
      subtitle="Catálogo de productos sincronizados desde la base de datos central"
    >
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead className="text-right">Precio Venta</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                  <p className="text-sm text-slate-400 mt-2">
                    Cargando productos desde la base de datos...
                  </p>
                </TableCell>
              </TableRow>
            ) : productionProducts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-10 text-slate-400"
                >
                  No hay productos registrados en la base de datos.
                </TableCell>
              </TableRow>
            ) : (
              productionProducts.map((product: any) => (
                <TableRow key={product.id}>
                  <TableCell className="font-mono text-sm text-slate-600">
                    {product.code || "—"}
                  </TableCell>
                  <TableCell className="font-bold text-slate-900">
                    {product.name}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getCategoryColor(product.category)}
                    >
                      {getCategoryLabel(product.category)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {product.presentationUnit || product.unit || "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-slate-700">
                    {product.salePrice
                      ? `S/ ${(product.salePrice / 100).toFixed(2)}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        product.status === "active"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }
                    >
                      {product.status === "active" ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
        <strong>ℹ️ Datos centralizados:</strong> Estos productos se obtienen
        directamente de la base de datos MySQL de Railway. Son visibles desde
        cualquier navegador o dispositivo.
      </div>
    </KefirControlLayout>
  );
}
