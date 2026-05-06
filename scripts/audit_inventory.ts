import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { products, inventory } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function check() {
  const connection = await mysql.createConnection("mysql://root:IWsffpKZIuiMhDZlJhcLYNEDpjfbyymC@shortline.proxy.rlwy.net:25975/railway");
  const db = drizzle(connection);
  
  console.log("Inventory Audit:");
  const results = await db.select({
    id: products.id,
    name: products.name,
    category: products.category,
    status: products.status,
    quantity: inventory.quantity,
    batchNumber: inventory.batchNumber
  })
  .from(inventory)
  .leftJoin(products, eq(inventory.productId, products.id));

  console.log("Total records in inventory table:", results.length);
  let totalUnits = 0;
  results.forEach(r => {
    console.log(`- ${r.name || 'Unknown'} (ID: ${r.id}, Cat: ${r.category}, Status: ${r.status}, Batch: ${r.batchNumber}): Qty: ${r.quantity}`);
    totalUnits += (r.quantity || 0);
  });
  console.log("Sum of quantities:", totalUnits);

  await connection.end();
}

check().catch(console.error);
