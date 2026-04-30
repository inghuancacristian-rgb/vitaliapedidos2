import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { users, customers } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function check() {
  const connection = await mysql.createConnection("mysql://root:IWsffpKZIuiMhDZlJhcLYNEDpjfbyymC@shortline.proxy.rlwy.net:25975/railway");
  const db = drizzle(connection);
  
  const user13 = await db.select().from(users).where(eq(users.id, 13));
  console.log("User 13:", user13);

  const customer1 = await db.select().from(customers).where(eq(customers.id, 1));
  console.log("Customer 1:", customer1);
  
  await connection.end();
  process.exit(0);
}

check().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
