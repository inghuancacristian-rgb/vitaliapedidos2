import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const exportProductionToPDF = (batches: any[]) => {
  const doc = new jsPDF() as any;
  const now = new Date();
  const dateStr = now.toLocaleDateString("es-BO");
  const timeStr = now.toLocaleTimeString("es-BO");

  // Header
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("Reporte de Producción", 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Generado el: ${dateStr} a las ${timeStr}`, 14, 30);
  doc.text(`Total de lotes registrados: ${batches.length}`, 14, 35);

  // Table Data
  const tableData = batches.map((b) => [
    b.batchNumber || "N/A",
    b.type === 'kefir_production' ? 'Elaboración de Kéfir' : 'Lavado de Nódulos',
    b.operatorName || 'Admin',
    format(new Date(b.startDate ?? b.createdAt), "dd/MM/yyyy HH:mm", { locale: es }),
    b.status === 'completed' ? 'Completado' : 'En Progreso',
  ]);

  doc.autoTable({
    startY: 45,
    head: [["Número de Lote", "Tipo de Operación", "Operario", "Fecha/Hora", "Estado"]],
    body: tableData,
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: 45 },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: 'bold' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 150;
  
  // Totals summary
  const completed = batches.filter(b => b.status === 'completed').length;
  const kefir = batches.filter(b => b.type === 'kefir_production').length;

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`Resumen del Reporte:`, 14, finalY + 15);
  doc.setFontSize(9);
  doc.text(`- Lotes Completados: ${completed}`, 14, finalY + 22);
  doc.text(`- Elaboraciones de Kéfir: ${kefir}`, 14, finalY + 27);
  doc.text(`- Lavados de Nódulos: ${batches.length - kefir}`, 14, finalY + 32);

  doc.save(`Reporte_Produccion_${now.getTime()}.pdf`);
};

export const exportProductionToExcel = (batches: any[]) => {
  const data = batches.map((b) => ({
    "Número de Lote": b.batchNumber || "N/A",
    "Tipo": b.type === 'kefir_production' ? 'Elaboración de Kéfir' : 'Lavado de Nódulos',
    "Operario": b.operatorName || 'Admin',
    "Fecha Inicio": format(new Date(b.startDate ?? b.createdAt), "yyyy-MM-dd HH:mm:ss"),
    "Estado": b.status === 'completed' ? 'Completado' : 'En Progreso',
    "Notas": b.notes || ""
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Producción");

  const filename = `Reporte_Produccion_${new Date().getTime()}.xlsx`;
  XLSX.writeFile(workbook, filename);
};
