import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { orders, orderItems } from "../drizzle/schema";
import { and, eq, ne } from "drizzle-orm";

async function check() {
  const connection = await mysql.createConnection("mysql://root:IWsffpKZIuiMhDZlJhcLYNEDpjfbyymC@shortline.proxy.rlwy.net:25975/railway");
  const db = drizzle(connection);
  
  console.log("Pending Orders / Reserved Stock:");
  const pendingOrders = await db.select()
    .from(orders)
    .where(and(
      ne(orders.status, 'delivered'),
      ne(orders.status, 'cancelled')
    ));

  console.log("Total pending orders:", pendingOrders.length);
  
  for (const order of pendingOrders) {
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    console.log(`Order ${order.orderNumber} (Status: ${order.status}):`);
    items.forEach(item => {
      console.log(`  - Product ID ${item.productId}: Qty ${item.quantity}`);
    });
  }

  await connection.end();
}

check().catch(console.error);
