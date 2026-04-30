import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { orders } from "../drizzle/schema";

async function check() {
  const connection = await mysql.createConnection("mysql://root:IWsffpKZIuiMhDZlJhcLYNEDpjfbyymC@shortline.proxy.rlwy.net:25975/railway");
  const db = drizzle(connection);
  
  const allOrders = await db.select().from(orders);
  console.log("All orders:");
  for (const o of allOrders) {
    console.log(`- ${o.orderNumber}: created at ${o.createdAt}`);
  }
  
  await connection.end();
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
