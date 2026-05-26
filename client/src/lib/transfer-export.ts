import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatCurrency } from "./currency";

export function exportTransferToPDF(transfer: any) {
  const doc = new jsPDF();
  const date = new Date(transfer.createdAt).toLocaleString("es-BO");
  
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("DOCUMENTO DE TRASPASO", 14, 20);

  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`N° Traspaso: ${transfer.transferNumber}`, 14, 30);
  doc.text(`Fecha y Hora: ${date}`, 14, 38);
  doc.text(`Dirección: ${transfer.direction === 'to_production' ? 'Inventario General -> Producción' : 'Producción -> Inventario General'}`, 14, 46);
  doc.text(`Usuario: ${transfer.userFullName || transfer.username || 'Sistema'}`, 14, 54);
  if (transfer.notes) {
    doc.text(`Notas: ${transfer.notes}`, 14, 62);
  }

  const tableData = transfer.items.map((item: any) => [
    item.productId,
    item.productName,
    item.quantity,
    item.productUnit
  ]);

  autoTable(doc, {
    startY: transfer.notes ? 70 : 62,
    head: [["ID Prod.", "Producto / Insumo", "Cantidad", "Unidad"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [15, 23, 42] },
    margin: { top: 10 },
  });

  // Espacios para firmas
  const finalY = (doc as any).lastAutoTable.finalY || 100;
  doc.line(30, finalY + 40, 80, finalY + 40);
  doc.text("Entregado por", 40, finalY + 48);
  
  doc.line(130, finalY + 40, 180, finalY + 40);
  doc.text("Recibido por", 140, finalY + 48);

  doc.save(`Traspaso_${transfer.transferNumber}.pdf`);
}

export function exportTransferToExcel(transfer: any) {
  const data = transfer.items.map((item: any) => ({
    "Traspaso": transfer.transferNumber,
    "Fecha": new Date(transfer.createdAt).toLocaleString("es-BO"),
    "Dirección": transfer.direction === 'to_production' ? 'A Producción' : 'A General',
    "Producto": item.productName,
    "Cantidad": item.quantity,
    "Unidad": item.productUnit,
    "Usuario": transfer.userFullName || transfer.username || 'Sistema',
    "Notas": transfer.notes || ""
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Traspaso");
  XLSX.writeFile(wb, `Traspaso_${transfer.transferNumber}.xlsx`);
}

export function exportTransfersHistoryToPDF(transfers: any[]) {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text("HISTORIAL DE TRASPASOS", 14, 20);

  doc.setFontSize(10);
  doc.text(`Generado: ${new Date().toLocaleString("es-BO")}`, 14, 28);

  const tableData = transfers.map((t: any) => [
    t.transferNumber,
    new Date(t.createdAt).toLocaleDateString("es-BO"),
    t.direction === 'to_production' ? 'A Prod.' : 'A Gral.',
    `${t.items?.length || 0} items`,
    t.userFullName || t.username || 'Sistema'
  ]);

  autoTable(doc, {
    startY: 35,
    head: [["Traspaso", "Fecha", "Dirección", "Items", "Usuario"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [15, 23, 42] },
  });

  doc.save(`Historial_Traspasos.pdf`);
}

export function exportTransfersHistoryToExcel(transfers: any[]) {
  const data = transfers.flatMap(t => 
    (t.items || []).map((item: any) => ({
      "N° Traspaso": t.transferNumber,
      "Fecha": new Date(t.createdAt).toLocaleString("es-BO"),
      "Dirección": t.direction === 'to_production' ? 'A Producción' : 'A General',
      "Usuario": t.userFullName || t.username || 'Sistema',
      "ID Prod": item.productId,
      "Producto": item.productName,
      "Cantidad": item.quantity,
      "Unidad": item.productUnit,
      "Notas": t.notes || ""
    }))
  );

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Historial Traspasos");
  XLSX.writeFile(wb, `Historial_Traspasos.xlsx`);
}
