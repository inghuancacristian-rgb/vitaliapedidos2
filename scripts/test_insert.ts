import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { products } from "../drizzle/schema";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("No DATABASE_URL");
  
  const pool = mysql.createPool(url);
  const db = drizzle(pool);

  const result = await db.insert(products).values({
    code: `TEST-${Date.now()}`,
    name: "Test Product",
    category: "finished_product",
    price: 100,
  });

  console.log("Result:", JSON.stringify(result, null, 2));
  console.log("Is array?", Array.isArray(result));
  if (Array.isArray(result)) {
    console.log("result[0]:", result[0]);
    console.log("insertId:", result[0]?.insertId);
  }
  
  process.exit(0);
}

main().catch(console.error);
