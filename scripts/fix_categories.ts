import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { products } from "../drizzle/schema";
import { inArray } from "drizzle-orm";

async function fix() {
  const connection = await mysql.createConnection("mysql://root:IWsffpKZIuiMhDZlJhcLYNEDpjfbyymC@shortline.proxy.rlwy.net:25975/railway");
  const db = drizzle(connection);
  
  console.log("Fixing categories for IDs 14, 15, 16, 17, 18...");
  const result = await db.update(products)
    .set({ category: 'supplies' })
    .where(inArray(products.id, [14, 15, 16, 17, 18]));
  
  console.log("Update completed.");
  await connection.end();
}

fix().catch(console.error);
