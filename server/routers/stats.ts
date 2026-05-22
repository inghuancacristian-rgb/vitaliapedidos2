import { protectedProcedure, router } from "../_core/trpc";
import { getAllOrders, getAllInventory, getAllProducts, getFinancialTransactions } from "../db";
import { TRPCError } from "@trpc/server";

export const statsRouter = router({
  // Obtener estadísticas del dashboard
  getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const orders = await getAllOrders();
    const inventory = await getAllInventory();
    const products = await getAllProducts();
    const transactions = await getFinancialTransactions();

    // Calcular ingresos por método desde las transacciones financieras
    const revenueByMethod = {
      cash: transactions
        .filter((t: any) => t.type === "income" && (t.paymentMethod === "cash" || !t.paymentMethod))
        .reduce((sum: number, t: any) => sum + t.amount, 0),
      qr: transactions
        .filter((t: any) => t.type === "income" && t.paymentMethod === "qr")
        .reduce((sum: number, t: any) => sum + t.amount, 0),
      transfer: transactions
        .filter((t: any) => t.type === "income" && t.paymentMethod === "transfer")
        .reduce((sum: number, t: any) => sum + t.amount, 0),
    };

    const stats = {
      totalOrders: orders.length,
      pendingOrders: orders.filter((o: any) => o.status === "pending").length,
      assignedOrders: orders.filter((o: any) => o.status === "assigned").length,
      inTransitOrders: orders.filter((o: any) => o.status === "in_transit").length,
      deliveredOrders: orders.filter((o: any) => o.status === "delivered").length,
      cancelledOrders: orders.filter((o: any) => o.status === "cancelled").length,
      totalRevenue: revenueByMethod.cash + revenueByMethod.qr + revenueByMethod.transfer,
      revenueByMethod,
      lowStockProducts: inventory.filter((inv: any) => inv.quantity <= inv.minStock).length,
      totalProducts: products.length,
      totalInventoryValue: inventory.reduce((sum: any, inv: any) => {
        const product = products.find((p: any) => p.id === inv.productId);
        return sum + (product ? product.price * inv.quantity : 0);
      }, 0),
    };

    return stats;
  }),

  // Obtener estadísticas del repartidor
  getDeliveryStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== "user") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const orders = await getAllOrders();
    const myOrders = orders.filter((o: any) => o.deliveryPersonId === ctx.user?.id);

    const stats = {
      totalAssigned: myOrders.length,
      pending: myOrders.filter((o: any) => o.status === "assigned").length,
      inTransit: myOrders.filter((o: any) => o.status === "in_transit").length,
      delivered: myOrders.filter((o: any) => o.status === "delivered").length,
      cancelled: myOrders.filter((o: any) => o.status === "cancelled").length,
    };

    return stats;
  }),
});
