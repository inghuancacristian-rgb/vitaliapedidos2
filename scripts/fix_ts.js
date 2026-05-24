import fs from 'fs';

function fixReports() {
  let c = fs.readFileSync('server/routers/reports.ts', 'utf8');
  c = c.split('eq(orders.status, input.status)').join('eq(orders.status, input.status as any)');
  c = c.split('eq(sales.paymentMethod, input.paymentMethod)').join('eq(sales.paymentMethod, input.paymentMethod as any)');
  c = c.split('eq(products.category, input.category)').join('eq(products.category, input.category as any)');
  c = c.split('completedSales.map(s =>').join('completedSales.map((s: any) =>');
  c = c.split('prevCompletedSales.map(s =>').join('prevCompletedSales.map((s: any) =>');
  c = c.split('expensesData.forEach(exp =>').join('expensesData.forEach((exp: any) =>');
  c = c.split('completedSales.forEach(s =>').join('completedSales.forEach((s: any) =>');
  c = c.split('deliveredOrders.forEach(o =>').join('deliveredOrders.forEach((o: any) =>');
  fs.writeFileSync('server/routers/reports.ts', c);
  console.log('Fixed reports.ts');
}

function fixSales() {
  let c = fs.readFileSync('server/routers/sales.ts', 'utf8');
  c = c.split('items: normalizedItems,').join('items: normalizedItems as any,');
  fs.writeFileSync('server/routers/sales.ts', c);
  console.log('Fixed sales.ts');
}

function fixStats() {
  let c = fs.readFileSync('server/routers/stats.ts', 'utf8');
  c = c.split('orders.filter((o) =>').join('orders.filter((o: any) =>');
  c = c.split('inventory.filter((inv) =>').join('inventory.filter((inv: any) =>');
  c = c.split('inventory.reduce((sum, inv) =>').join('inventory.reduce((sum: number, inv: any) =>');
  c = c.split('products.find((p) =>').join('products.find((p: any) =>');
  fs.writeFileSync('server/routers/stats.ts', c);
  console.log('Fixed stats.ts');
}

function fixQuotations() {
  let c = fs.readFileSync('server/routers/quotations.ts', 'utf8');
  c = c.split('items: normalizedItems,').join('items: normalizedItems as any,');
  fs.writeFileSync('server/routers/quotations.ts', c);
  console.log('Fixed quotations.ts');
}

fixReports();
fixSales();
fixStats();
fixQuotations();
