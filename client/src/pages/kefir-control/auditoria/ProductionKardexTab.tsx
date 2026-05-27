import { Loader2 } from "lucide-react";
import { memo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ProductionMovementItem = {
  id: number | string;
  createdAt: string | Date;
  productName: string;
  reason?: string | null;
  changeAmount: number | string;
  newQuantity: number | string;
};

type ProductionKardexTabProps = {
  movements: ProductionMovementItem[];
  loadingMovements: boolean;
  safeFormat: (dateVal: any, fmt: string) => string;
};

function ProductionKardexTab({
  movements,
  loadingMovements,
  safeFormat,
}: ProductionKardexTabProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead className="text-right">Movimiento</TableHead>
            <TableHead className="text-right">Stock Resultante</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loadingMovements ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-10">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
              </TableCell>
            </TableRow>
          ) : !movements || movements.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center py-10 text-slate-400"
              >
                No hay movimientos registrados aún.
              </TableCell>
            </TableRow>
          ) : (
            movements.map(mov => (
              <TableRow key={mov.id}>
                <TableCell className="text-slate-500">
                  {safeFormat(mov.createdAt, "dd MMM yyyy, HH:mm")}
                </TableCell>
                <TableCell className="font-bold text-slate-900">
                  {mov.productName}
                </TableCell>
                <TableCell className="text-slate-600">{mov.reason}</TableCell>
                <TableCell className="text-right">
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-sm ${
                      Number(mov.changeAmount) > 0
                        ? "bg-emerald-50 text-emerald-600"
                        : Number(mov.changeAmount) < 0
                          ? "bg-rose-50 text-rose-600"
                          : "bg-slate-50 text-slate-600"
                    }`}
                  >
                    {Number(mov.changeAmount) > 0 ? "+" : ""}
                    {mov.changeAmount}
                  </span>
                </TableCell>
                <TableCell className="text-right text-slate-500 font-medium">
                  {mov.newQuantity}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default memo(ProductionKardexTab);
