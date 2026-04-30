import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { financialTransactions, cashOpenings } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

async function check() {
  console.log("Connecting to production DB...");
  const connection = await mysql.createConnection("mysql://root:IWsffpKZIuiMhDZlJhcLYNEDpjfbyymC@shortline.proxy.rlwy.net:25975/railway");
  const db = drizzle(connection);
  
  console.log("Fetching recent transactions...");
  const txs = await db.select().from(financialTransactions).orderBy(desc(financialTransactions.createdAt)).limit(10);
  console.log("Last 10 transactions:", txs);
  
  await connection.end();
  process.exit(0);
}

check().catch(err => {
  console.error("Error checking DB:", err);
  process.exit(1);
});
