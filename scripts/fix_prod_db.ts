import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { cashOpenings } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function fix() {
  console.log("Connecting to production DB...");
  const connection = await mysql.createConnection("mysql://root:IWsffpKZIuiMhDZlJhcLYNEDpjfbyymC@shortline.proxy.rlwy.net:25975/railway");
  const db = drizzle(connection);
  
  console.log("Executing force close...");
  const result = await db.update(cashOpenings).set({ status: 'closed' }).where(eq(cashOpenings.status, 'open'));
  console.log("Production DB fix result:", result);
  
  await connection.end();
  process.exit(0);
}

fix().catch(err => {
  console.error("Error fixing DB:", err);
  process.exit(1);
});
