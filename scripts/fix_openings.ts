import "dotenv/config";
import { getDb } from "../server/db";
import { cashOpenings } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function fix() {
  console.log("Fixing open cash openings...", process.env.DATABASE_URL ? "using DB" : "No DB Url");
  const db = await getDb();
  if (db) {
    const result = await db.update(cashOpenings).set({ status: 'closed' }).where(eq(cashOpenings.status, 'open'));
    console.log("Fixed SQL! Result:", result);
  } else {
    console.log("No DB...");
  }
  process.exit(0);
}

fix().catch(err => {
  console.error(err);
  process.exit(1);
});
