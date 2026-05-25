import { getDb } from "./server/db.js";
import { cashOpenings } from "./server/schema.js";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.log("No db connection");
    return;
  }
  
  const openings = await db.select().from(cashOpenings).where(sql`${cashOpenings.status} = 'open'`);
  console.log("OPEN CASH REGISTERS:");
  console.log(openings);
}

main().catch(console.error).then(() => process.exit(0));
