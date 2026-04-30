import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { products } from "../drizzle/schema";

async function check() {
  const connection = await mysql.createConnection("mysql://root:IWsffpKZIuiMhDZlJhcLYNEDpjfbyymC@shortline.proxy.rlwy.net:25975/railway");
  const db = drizzle(connection);
  
  console.log("Products in DB:");
  const allProducts = await db.select().from(products);
  if (allProducts.length === 0) {
    console.log("NO PRODUCTS FOUND.");
  } else {
    allProducts.forEach(p => console.log(`- ${p.name} (ID: ${p.id}, Category: ${p.category})`));
  }

  await connection.end();
}

check().catch(console.error);
