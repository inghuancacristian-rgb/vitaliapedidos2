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

  // Análisis de Negocio (Gráficos)
  getBusinessAnalysis: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      let dateFilter: any = undefined;
      if (input?.startDate && input?.endDate) {
        dateFilter = and(
          gte(orders.createdAt, new Date(input.startDate)),
          lte(orders.createdAt, new Date(input.endDate + " 23:59:59"))
        );
      }

      // 1. Obtener todas las órdenes entregadas en el período
      const deliveredOrders = await db.query.orders.findMany({
        where: and(
          eq(orders.status, "delivered"),
          dateFilter
        ),
        with: {
          customer: true,
          items: {
            with: {
              product: true,
            },
          },
        },
      });

      // 2. Procesar entregas por fecha (Día)
      const deliveriesByDay: Record<string, number> = {};
      deliveredOrders.forEach(order => {
        const date = order.deliveredAt 
          ? new Date(order.deliveredAt).toISOString().split('T')[0]
          : new Date(order.createdAt).toISOString().split('T')[0];
        deliveriesByDay[date] = (deliveriesByDay[date] || 0) + 1;
      });

      // Convertir a array para Recharts
      const deliveriesData = Object.entries(deliveriesByDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // 3. Sabores (productos) más entregados
      const flavorStats: Record<string, number> = {};
      deliveredOrders.forEach(order => {
        order.items.forEach(item => {
          const productName = item.product?.name || "Desconocido";
          flavorStats[productName] = (flavorStats[productName] || 0) + item.quantity;
        });
      });

      const topFlavors = Object.entries(flavorStats)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      // 4. Demografía por Género
      const genderStats: Record<string, number> = {
        "Masculino": 0,
        "Femenino": 0,
        "No especificado": 0
      };

      deliveredOrders.forEach(order => {
        const gender = order.customer?.gender;
        const normalizedGender = gender?.toLowerCase();
        if (normalizedGender === "varon" || normalizedGender === "male" || normalizedGender === "masculino") {
          genderStats["Masculino"]++;
        } else if (normalizedGender === "mujer" || normalizedGender === "female" || normalizedGender === "femenino") {
          genderStats["Femenino"]++;
        } else {
          genderStats["No especificado"]++;
        }
      });

      const customerDemographics = Object.entries(genderStats)
        .map(([name, value]) => ({ name, value }))
        .filter(item => item.value > 0);

      // 5. Canales de Origen
      const channelStats: Record<string, number> = {};
      deliveredOrders.forEach(order => {
        const channel = order.sourceChannel || "otro";
        channelStats[channel] = (channelStats[channel] || 0) + 1;
      });

      const channelsData = Object.entries(channelStats)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // 6. Distribución por Zonas
      const zoneStats: Record<string, number> = {};
      deliveredOrders.forEach(order => {
        const zone = order.zone || "Sin zona";
        zoneStats[zone] = (zoneStats[zone] || 0) + 1;
      });

      const zonesData = Object.entries(zoneStats)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      // 7. Métricas resumen
      const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.totalPrice, 0);
      const avgOrderValue = deliveredOrders.length > 0 ? totalRevenue / deliveredOrders.length : 0;

      return {
        deliveriesData,
        topFlavors,
        customerDemographics,
        channelsData,
        zonesData,
        summary: {
          totalDeliveries: deliveredOrders.length,
          totalRevenue,
          avgOrderValue,
        }
      };
    }),
});