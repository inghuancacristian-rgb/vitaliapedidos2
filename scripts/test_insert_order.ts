import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { orders } from "../drizzle/schema";

async function test() {
  const connection = await mysql.createConnection("mysql://root:IWsffpKZIuiMhDZlJhcLYNEDpjfbyymC@shortline.proxy.rlwy.net:25975/railway");
  const db = drizzle(connection);
  
  try {
    await db.insert(orders).values({
      orderNumber: "ORD-002",
      customerId: 1,
      deliveryPersonId: 13,
      zone: "CRUCE VILLA ADELA",
      status: "assigned",
      totalPrice: 5500,
      paymentMethod: "cash",
      paymentStatus: "pending",
      sourceChannel: "marketplace",
      deliveryDate: "2026-04-30",
      deliveryTime: "14:00"
    });
    console.log("Success!");
  } catch (err) {
    console.error("Error executing insert:", err);
  }
  
  await connection.end();
  process.exit(0);
}

test();
