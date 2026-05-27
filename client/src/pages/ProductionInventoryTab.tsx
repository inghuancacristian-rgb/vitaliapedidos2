import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ProductionInventoryItem = {
  id: number | string;
  productName: string;
  category?: string | null;
  quantity: number;
  unit?: string | null;
};

type ProductionInventoryTabProps = {
  inventoryWithStock: ProductionInventoryItem[];
  loadingInv: boolean;
};

export default function ProductionInventoryTab({
  inventoryWithStock,
  loadingInv,
}: ProductionInventoryTabProps) {
  return <TabsInventory inventoryWithStock={inventoryWithStock} loadingInv={loadingInv} />;
}

function TabsInventory({
  inventoryWithStock,
  loadingInv,
}: Pick<ProductionInventoryTabProps, "inventoryWithStock" | "loadingInv">) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead className="text-right">Stock en Planta</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loadingInv ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center py-10">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
              </TableCell>
            </TableRow>
          ) : inventoryWithStock.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center py-10 text-slate-400">
                No hay productos en el almacén de planta. Finalice un lote para generar stock.
              </TableCell>
            </TableRow>
          ) : (
            inventoryWithStock.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-bold text-slate-900">{item.productName}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-slate-50 capitalize">
                    {String(item.category ?? "").replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-bold text-lg text-slate-700">
                  {item.quantity}{" "}
                  <span className="text-sm font-normal text-slate-500">{item.unit}</span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
