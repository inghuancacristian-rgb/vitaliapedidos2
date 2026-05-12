import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type BusinessData = {
  summary: {
    totalRevenue: number;
    totalDeliveries: number;
    totalSales: number;
    totalTransactions: number;
    totalCustomers: number;
    activeZones: number;
    totalExpenses: number;
    netIncome: number;
  };
  deliveriesByDay: { date: string; value: number }[];
  topProducts: { name: string; value: number }[];
  customersByChannel: { name: string; value: number }[];
  customersByZone: { name: string; value: number }[];
  customersByGender: { name: string; value: number }[];
  revenueByPaymentMethod: { name: string; value: number }[];
  expensesByCategory: { name: string; value: number }[];
};

export const exportBusinessToPDF = (data: BusinessData, periodStr: string) => {
  const doc = new jsPDF();
  const title = `Reporte de Análisis de Negocio - ${periodStr}`;

  doc.setFontSize(16);
  doc.text(title, 14, 15);

  doc.setFontSize(10);
  doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 22);

  // Métrica principal
  let yPos = 35;
  doc.setFontSize(12);
  doc.text("Resumen Financiero y Operativo", 14, yPos);
  
  const summaryData = [
    ["Transacciones Totales", data.summary.totalTransactions.toString()],
    ["N° de Entregas (Delivery)", data.summary.totalDeliveries.toString()],
    ["N° de Ventas (Directas)", data.summary.totalSales.toString()],
    ["Ingresos Brutos", `Bs. ${(data.summary.totalRevenue / 100).toFixed(2)}`],
    ["Gastos Operativos", `Bs. ${(data.summary.totalExpenses / 100).toFixed(2)}`],
    ["Utilidad Neta", `Bs. ${(data.summary.netIncome / 100).toFixed(2)}`],
    ["Clientes Atendidos", data.summary.totalCustomers.toString()],
    ["Zonas Activas", data.summary.activeZones.toString()],
  ];

  (doc as any).autoTable({
    startY: yPos + 5,
    head: [["Métrica", "Valor"]],
    body: summaryData,
    theme: "grid",
    headStyles: { fillColor: [16, 185, 129] },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Top Productos
  doc.text("Top Productos Más Vendidos", 14, yPos);
  const productsData = data.topProducts.map((p) => [p.name, p.value.toString()]);
  
  (doc as any).autoTable({
    startY: yPos + 5,
    head: [["Producto", "Unidades Vendidas"]],
    body: productsData,
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246] },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  // Canales de Captación
  doc.text("Canales de Captación", 14, yPos);
  const channelsData = data.customersByChannel.map((c) => [c.name, c.value.toString()]);
  
  (doc as any).autoTable({
    startY: yPos + 5,
    head: [["Canal", "Cantidad"]],
    body: channelsData,
    theme: "grid",
    headStyles: { fillColor: [245, 158, 11] },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;

  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  // Gastos por Categoría
  doc.text("Distribución de Gastos Operativos", 14, yPos);
  const expensesData = data.expensesByCategory.map((c) => [c.name, `Bs. ${(c.value / 100).toFixed(2)}`]);
  
  (doc as any).autoTable({
    startY: yPos + 5,
    head: [["Categoría", "Monto"]],
    body: expensesData,
    theme: "grid",
    headStyles: { fillColor: [239, 68, 68] },
  });

  doc.save(`analisis_negocio_${format(new Date(), "yyyyMMdd")}.pdf`);
};

export const exportBusinessToExcel = (data: BusinessData, periodStr: string) => {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Resumen
  const summaryWsData = [
    ["Reporte de Análisis de Negocio", periodStr],
    ["Fecha de Generación", format(new Date(), "dd/MM/yyyy HH:mm")],
    [],
    ["Métrica", "Valor"],
    ["Transacciones Totales", data.summary.totalTransactions],
    ["N° de Entregas (Delivery)", data.summary.totalDeliveries],
    ["N° de Ventas (Directas)", data.summary.totalSales],
    ["Ingresos Brutos", (data.summary.totalRevenue / 100).toFixed(2)],
    ["Gastos Operativos", (data.summary.totalExpenses / 100).toFixed(2)],
    ["Utilidad Neta", (data.summary.netIncome / 100).toFixed(2)],
    ["Clientes Atendidos", data.summary.totalCustomers],
    ["Zonas Activas", data.summary.activeZones],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryWsData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");

  // Hoja 2: Top Productos
  const productsWsData = [
    ["Producto", "Unidades Vendidas"],
    ...data.topProducts.map((p) => [p.name, p.value]),
  ];
  const wsProducts = XLSX.utils.aoa_to_sheet(productsWsData);
  XLSX.utils.book_append_sheet(wb, wsProducts, "Top Productos");

  // Hoja 3: Canales y Zonas
  const channelsWsData = [
    ["Canal", "Cantidad"],
    ...data.customersByChannel.map((c) => [c.name, c.value]),
    [],
    ["Zona", "Cantidad"],
    ...data.customersByZone.map((z) => [z.name, z.value]),
  ];
  const wsChannels = XLSX.utils.aoa_to_sheet(channelsWsData);
  XLSX.utils.book_append_sheet(wb, wsChannels, "Segmentación");

  // Hoja 4: Gastos por Categoría
  const expensesWsData = [
    ["Categoría de Gasto", "Monto (Bs)"],
    ...data.expensesByCategory.map((c) => [c.name, (c.value / 100).toFixed(2)]),
  ];
  const wsExpenses = XLSX.utils.aoa_to_sheet(expensesWsData);
  XLSX.utils.book_append_sheet(wb, wsExpenses, "Gastos");

  XLSX.writeFile(wb, `analisis_negocio_${format(new Date(), "yyyyMMdd")}.xlsx`);
};
