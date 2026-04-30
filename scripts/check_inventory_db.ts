import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { products, inventory } from "../drizzle/schema";

async function check() {
  const connection = await mysql.createConnection("mysql://root:IWsffpKZIuiMhDZlJhcLYNEDpjfbyymC@shortline.proxy.rlwy.net:25975/railway");
  const db = drizzle(connection);
  
  console.log("Products in DB:");
  const allProducts = await db.select().from(products);
  allProducts.forEach(p => console.log(`- ${p.name} (ID: ${p.id}, Category: ${p.category})`));

  console.log("\nInventory records:");
  const allInventory = await db.select().from(inventory);
  allInventory.forEach(i => console.log(`- Product ID: ${i.productId}, Quantity: ${i.quantity}`));

  await connection.end();
}

check();
