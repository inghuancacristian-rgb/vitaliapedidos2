import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { cashOpenings } from "../drizzle/schema";

async function check() {
  const connection = await mysql.createConnection("mysql://root:IWsffpKZIuiMhDZlJhcLYNEDpjfbyymC@shortline.proxy.rlwy.net:25975/railway");
  const db = drizzle(connection);
  
  const openings = await db.select().from(cashOpenings);
  console.log("Openings:", openings);
  
  await connection.end();
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
