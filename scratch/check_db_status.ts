
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { orders, sales } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

async function check() {
  if (!process.env.DATABASE_URL) {
    console.log("No DATABASE_URL found");
    return;
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  const deliveredOrdersCount = await db.select().from(orders).where(eq(orders.status, "delivered"));
  const completedSalesCount = await db.select().from(sales).where(eq(sales.status, "completed"));

  console.log("Delivered Orders:", deliveredOrdersCount.length);
  console.log("Completed Sales:", completedSalesCount.length);

  if (deliveredOrdersCount.length > 0) {
    console.log("Sample Order Date:", deliveredOrdersCount[0].createdAt);
    console.log("Sample Order Status:", deliveredOrdersCount[0].status);
  }

  if (completedSalesCount.length > 0) {
    console.log("Sample Sale Date:", completedSalesCount[0].createdAt);
    console.log("Sample Sale Status:", completedSalesCount[0].status);
  }

  process.exit(0);
}

check();
