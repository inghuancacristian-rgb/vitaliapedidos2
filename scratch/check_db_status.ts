
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { orders, sales, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

async function check() {
  if (!process.env.DATABASE_URL) {
    console.log("No DATABASE_URL found");
    return;
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  const allUsers = await db.select().from(users);
  console.log("Users in DB:", allUsers.map(u => u.username));

  const allOrders = await db.select().from(orders);
  const statusCounts: Record<string, number> = {};
  allOrders.forEach(o => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  });
  console.log("Status counts:", statusCounts);

  process.exit(0);
}

check();
