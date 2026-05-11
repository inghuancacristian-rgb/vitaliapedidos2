import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import { getDb } from "../db.js";
import {
  orders,
  customers,
  products,
  inventory,
  inventoryMovements,
  sales,
  financialTransactions,
  cashClosures,
  users,
} from "../../drizzle/schema.js";
import { desc, eq, and, gte, lte, sql, ne } from "drizzle-orm";

export const reportsRouter = router({
  // Reporte de Pedidos
  ordersReport: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      status: z.string().optional(),
      customerId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let conditions: any[] = [];

      if (input?.startDate) {
        conditions.push(gte(orders.createdAt, new Date(input.startDate)));
      }
      if (input?.endDate) {
        conditions.push(lte(orders.createdAt, new Date(input.endDate + " 23:59:59")));
      }
      if (input?.status) {
        conditions.push(eq(orders.status, input.status));
      }
      if (input?.customerId) {
        conditions.push(eq(orders.customerId, input.customerId));
      }

      const result = await db.query.orders.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          customer: true,
          deliveryPerson: true,
          items: {
            with: {
              product: true,
            },
          },
          payments: true,
        },
        orderBy: [desc(orders.createdAt)],
      });

      return result;
    }),

  // Reporte de Ventas
  salesReport: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      paymentMethod: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let conditions: any[] = [];

      if (input?.startDate) {
        conditions.push(gte(sales.createdAt, new Date(input.startDate)));
      }
      if (input?.endDate) {
        conditions.push(lte(sales.createdAt, new Date(input.endDate + " 23:59:59")));
      }
      if (input?.paymentMethod) {
        conditions.push(eq(sales.paymentMethod, input.paymentMethod));
      }

      const result = await db.query.sales.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          customer: true,
          items: {
            with: {
              product: true,
            },
          },
        },
        orderBy: [desc(sales.createdAt)],
      });

      return result;
    }),

  // Reporte de Inventario (productos con stock)
  inventoryReport: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { products: [], inventory: [] };

      let productConditions: any[] = [];
      if (input?.category) {
        productConditions.push(eq(products.category, input.category));
      }

      const allProducts = await db.query.products.findMany({
        where: productConditions.length > 0 ? and(...productConditions) : undefined,
      });

      const allInventory = await db.query.inventory.findMany();

      return {
        products: allProducts,
        inventory: allInventory,
      };
    }),

  // Reporte de Movimientos de Inventario
  inventoryMovementsReport: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      productId: z.number().optional(),
      type: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { movements: [], products: [] };

      let conditions: any[] = [];

      if (input?.startDate) {
        conditions.push(gte(inventoryMovements.createdAt, new Date(input.startDate)));
      }
      if (input?.endDate) {
        conditions.push(lte(inventoryMovements.createdAt, new Date(input.endDate + " 23:59:59")));
      }
      if (input?.productId) {
        conditions.push(eq(inventoryMovements.productId, input.productId));
      }
      if (input?.type) {
        conditions.push(eq(inventoryMovements.type, input.type as any));
      }

      const result = await db.query.inventoryMovements.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          user: true,
        },
        orderBy: [desc(inventoryMovements.createdAt)],
      });

      const allProducts = await db.query.products.findMany();

      return {
        movements: result,
        products: allProducts,
      };
    }),

  // Reporte Financiero
  financeReport: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      type: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { transactions: [], closures: [] };

      let conditions: any[] = [];

      if (input?.startDate) {
        conditions.push(gte(financialTransactions.createdAt, new Date(input.startDate)));
      }
      if (input?.endDate) {
        conditions.push(lte(financialTransactions.createdAt, new Date(input.endDate + " 23:59:59")));
      }
      if (input?.type) {
        conditions.push(eq(financialTransactions.type, input.type as any));
      }

      const transactions = await db.query.financialTransactions.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          user: true,
        },
        orderBy: [desc(financialTransactions.createdAt)],
      });

      const closures = await db.query.cashClosures.findMany({
        orderBy: [desc(cashClosures.createdAt)],
        limit: 30,
      });

      return {
        transactions,
        closures,
      };
    }),

  // Reporte de Clientes
  customersReport: protectedProcedure
    .input(z.object({
      zone: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let conditions: any[] = [];

      if (input?.zone) {
        conditions.push(eq(customers.zone, input.zone));
      }

      const result = await db.query.customers.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [desc(customers.createdAt)],
      });

      return result;
    }),

  // Resumen para dashboard
  summary: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return {
          totalOrders: 0,
          ordersByStatus: [],
          salesTotal: 0,
          salesCount: 0,
          salesByPayment: [],
          lowStockProducts: 0,
          newCustomers: 0,
        };
      }

      let dateFilter: any = undefined;
      if (input?.startDate && input?.endDate) {
        dateFilter = and(
          gte(orders.createdAt, new Date(input.startDate)),
          lte(orders.createdAt, new Date(input.endDate + " 23:59:59"))
        );
      }

      // Total pedidos
      const totalOrdersResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(dateFilter);
      const totalOrders = totalOrdersResult[0]?.count || 0;

      // Pedidos por estado
      const ordersByStatus = await db
        .select({
          status: orders.status,
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(orders)
        .where(dateFilter)
        .groupBy(orders.status);

      // Ventas del período
      const salesStartDate = input?.startDate || new Date(new Date().setDate(1)).toISOString();
      const salesEndDate = input?.endDate || new Date().toISOString();
      const dateFilterSales = and(
        gte(sales.createdAt, new Date(salesStartDate)),
        lte(sales.createdAt, new Date(salesEndDate + " 23:59:59"))
      );

      const totalSales = await db
        .select({
          total: sql<number>`coalesce(sum(${sales.total}), 0)`.mapWith(Number),
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(sales)
        .where(and(eq(sales.status, "completed"), dateFilterSales));

      // Ventas por método de pago
      const salesByPayment = await db
        .select({
          method: sales.paymentMethod,
          total: sql<number>`coalesce(sum(${sales.total}), 0)`.mapWith(Number),
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(sales)
        .where(and(eq(sales.status, "completed"), dateFilterSales))
        .groupBy(sales.paymentMethod);

      // Productos con stock bajo
      const lowStockProducts = await db
        .select({
          product: products,
          inventory: inventory,
        })
        .from(inventory)
        .innerJoin(products, eq(inventory.productId, products.id))
        .where(sql`${inventory.quantity} <= ${inventory.minStock}`);

      // Nuevos clientes
      const newCustomersResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(customers)
        .where(dateFilter);
      const newCustomers = newCustomersResult[0]?.count || 0;

      return {
        totalOrders,
        ordersByStatus,
        salesTotal: totalSales[0]?.total || 0,
        salesCount: totalSales[0]?.count || 0,
        salesByPayment,
        lowStockProducts: lowStockProducts.length,
        newCustomers,
      };
    }),

  // Análisis de Negocio
  getBusinessAnalysis: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      let dateFilterOrders = undefined;
      let dateFilterSales = undefined;

      if (input?.startDate && input?.endDate) {
        const start = new Date(input.startDate);
        const end = new Date(input.endDate + " 23:59:59");
        
        dateFilterOrders = and(
          gte(orders.createdAt, start),
          lte(orders.createdAt, end)
        );
        dateFilterSales = and(
          gte(sales.createdAt, start),
          lte(sales.createdAt, end)
        );
      }

      // 1. Obtener órdenes entregadas
      const deliveredOrders = await db.query.orders.findMany({
        where: and(
          eq(orders.status, "delivered"),
          dateFilterOrders
        ),
        with: {
          items: {
            with: {
              product: true
            }
          },
          customer: true
        }
      });

      // 2. Obtener ventas completadas (incluyendo ventas locales y delivery)
      const completedSales = await db.query.sales.findMany({
        where: and(
          eq(sales.status, "completed"),
          dateFilterSales
        ),
        with: {
          items: {
            with: {
              product: true
            }
          },
          customer: true
        }
      });

      // Evitar duplicados: Si una venta está vinculada a una orden entregada, solo contamos la venta para el dinero
      // pero para "entregas" podemos usar ambas fuentes.
      const processedOrderIds = new Set(completedSales.map(s => s.orderId).filter(Boolean));
      
      // Métricas de Entregas (Orders + Sales que sean Delivery)
      const deliveriesByDay: Record<string, number> = {};
      const productCounts: Record<string, number> = {};
      const channelCounts: Record<string, number> = {
        facebook: 0,
        tiktok: 0,
        marketplace: 0,
        referral: 0,
        other: 0,
        local: 0
      };
      const zoneCounts: Record<string, number> = {};
      const genderCounts: Record<string, number> = { male: 0, female: 0, other: 0 };
        const paymentCounts: Record<string, number> = { cash: 0, qr: 0, transfer: 0 };
      const customerSales: Record<string, { name: string, value: number }> = {};
      
      let totalRevenue = 0;
      let totalTransactions = 0;

      // Procesar Ventas (Fuente primaria de ingresos y productos)
      completedSales.forEach(sale => {
        totalRevenue += sale.total;
        totalTransactions++;

        const date = new Date(sale.createdAt).toISOString().split('T')[0];
        deliveriesByDay[date] = (deliveriesByDay[date] || 0) + 1;

        // Métodos de pago
        const method = sale.paymentMethod || "cash";
        paymentCounts[method] = (paymentCounts[method] || 0) + sale.total;

        // Productos
        sale.items.forEach(item => {
          const name = item.product.name;
          productCounts[name] = (productCounts[name] || 0) + item.quantity;
        });

        // Cliente
        if (sale.customer) {
          const cId = sale.customer.id.toString();
          if (!customerSales[cId]) customerSales[cId] = { name: sale.customer.name, value: 0 };
          customerSales[cId].value += sale.total;

          const channel = sale.customer.sourceChannel || "other";
          channelCounts[channel] = (channelCounts[channel] || 0) + 1;

          if (sale.customer.zone) {
            zoneCounts[sale.customer.zone] = (zoneCounts[sale.customer.zone] || 0) + 1;
          }

          const g = (sale.customer.gender || "").toLowerCase();
          if (g.includes("m") || g.includes("v") || g.includes("h")) genderCounts.male++;
          else if (g.includes("f") || g.includes("w") || g.includes("m")) genderCounts.female++;
          else genderCounts.other++;
        } else {
          channelCounts.local++;
          const cName = sale.customerName || "Venta Local";
          if (!customerSales["local"]) customerSales["local"] = { name: "Ventas Locales", value: 0 };
          customerSales["local"].value += sale.total;
        }
      });

      // Procesar Órdenes que NO están en ventas
      deliveredOrders.forEach(order => {
        if (processedOrderIds.has(order.id)) return;

        totalTransactions++;
        const totalAmount = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        totalRevenue += totalAmount;

        const date = new Date(order.createdAt).toISOString().split('T')[0];
        deliveriesByDay[date] = (deliveriesByDay[date] || 0) + 1;

        order.items.forEach(item => {
          const name = item.product.name;
          productCounts[name] = (productCounts[name] || 0) + item.quantity;
        });

        if (order.customer) {
          const cId = order.customer.id.toString();
          if (!customerSales[cId]) customerSales[cId] = { name: order.customer.name, value: 0 };
          customerSales[cId].value += totalAmount;

          const channel = order.customer.sourceChannel || "other";
          channelCounts[channel] = (channelCounts[channel] || 0) + 1;
          if (order.customer.zone) {
            zoneCounts[order.customer.zone] = (zoneCounts[order.customer.zone] || 0) + 1;
          }
          const g = (order.customer.gender || "").toLowerCase();
          if (g.includes("m") || g.includes("v") || g.includes("h")) genderCounts.male++;
          else if (g.includes("f") || g.includes("w") || g.includes("m")) genderCounts.female++;
          else genderCounts.other++;
        }
      });

      if (totalTransactions === 0) return null;

      // Formatear para Recharts
      const deliveriesData = Object.entries(deliveriesByDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const topFlavors = Object.entries(productCounts)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      const customerDemographics = [
        { name: "Varones", value: genderCounts.male },
        { name: "Mujeres", value: genderCounts.female },
        { name: "Otros/No espec.", value: genderCounts.other },
      ].filter(v => v.value > 0);

      const channelsData = Object.entries(channelCounts)
        .map(([name, value]) => ({ 
          name: name.charAt(0).toUpperCase() + name.slice(1), 
          value 
        }))
        .filter(v => v.value > 0);

      const zonesData = Object.entries(zoneCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      const paymentMethods = Object.entries(paymentCounts)
        .map(([name, value]) => ({ 
          name: name === "cash" ? "Efectivo" : name === "qr" ? "QR" : "Transferencia", 
          value: value / 100 
        }))
        .filter(v => v.value > 0);

      const topCustomers = Object.values(customerSales)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
        .map(c => ({ name: c.name, value: c.value / 100 }));

      return {
        deliveriesData,
        topFlavors,
        customerDemographics,
        channelsData,
        zonesData,
        paymentMethods,
        topCustomers,
        summary: {
          totalDeliveries: totalTransactions,
          totalRevenue: totalRevenue, // en centavos
          avgOrderValue: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
          activeZones: Object.keys(zoneCounts).length
        },
        debug: {
          startDate: input?.startDate,
          endDate: input?.endDate,
          deliveredOrdersFound: deliveredOrders.length,
          completedSalesFound: completedSales.length,
          totalTransactions,
        }
      };
    }),
});