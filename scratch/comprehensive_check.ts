
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { orders, sales, inventory, products, cashClosures, users } from "../drizzle/schema";
import * as dotenv from "dotenv";

dotenv.config();

async function checkAll() {
  if (!process.env.DATABASE_URL) {
    console.log("No DATABASE_URL found");
    return;
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  const [
    ordersCount,
    salesCount,
    inventoryCount,
    productsCount,
    closuresCount,
    usersCount
  ] = await Promise.all([
    db.select().from(orders),
    db.select().from(sales),
    db.select().from(inventory),
    db.select().from(products),
    db.select().from(cashClosures),
    db.select().from(users)
  ]);

  console.log("--- DATA STATUS REPORT ---");
  console.log("Orders:", ordersCount.length);
  console.log("Sales:", salesCount.length);
  console.log("Inventory records:", inventoryCount.length);
  console.log("Products defined:", productsCount.length);
  console.log("Cash Closures:", closuresCount.length);
  console.log("Total Users:", usersCount.length);
  console.log("--------------------------");

  process.exit(0);
}

checkAll().catch(err => {
  console.error("Check failed:", err);
  process.exit(1);
});
