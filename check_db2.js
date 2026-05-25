import { getDb } from "./server/db.js";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) return;
  const data = await db.execute(sql`SELECT id, responsibleUserId, openingDate, paymentMethod, status FROM cashOpenings WHERE status = 'open'`);
  console.log(data);
}

main();
