import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { products, inventory } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("No DATABASE_URL");
  
  const pool = mysql.createPool(url);
  const db = drizzle(pool);

  const allProducts = await db.select().from(products);
  const allInventory = await db.select().from(inventory);
  
  let fixedCount = 0;
  for (const prod of allProducts) {
    const hasInv = allInventory.find(i => i.productId === prod.id);
    if (!hasInv) {
      console.log(`Fixing orphaned product ${prod.id}: ${prod.name}`);
      await db.insert(inventory).values({
        productId: prod.id,
        quantity: 0,
        minStock: 5
      });
      fixedCount++;
    }
  }

  console.log(`Done! Fixed ${fixedCount} orphaned products.`);
  process.exit(0);
}

main().catch(console.error);
