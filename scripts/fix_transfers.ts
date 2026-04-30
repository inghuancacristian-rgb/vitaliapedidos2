import { db } from "../server/db";
import { financialTransactions, cashOpenings } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("Checking recent transactions...");
  try {
    const txs = await db.select()
      .from(financialTransactions)
      .orderBy(desc(financialTransactions.createdAt))
      .limit(10);
      
    console.log("Last 10 transactions:", txs);
  } catch(e) {
    console.error("Error:", e);
  }
  process.exit(0);
}

main();
