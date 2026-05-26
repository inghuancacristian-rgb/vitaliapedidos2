import "dotenv/config";
import { getDb } from "./server/db.js";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Getting DB...");
  const db = await getDb();
  if (!db) {
    console.error("No DB connection");
    process.exit(1);
  }

  console.log("Creating inventory_transfers...");
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS inventory_transfers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      transferNumber VARCHAR(50) NOT NULL UNIQUE,
      direction ENUM('to_production', 'to_general') NOT NULL,
      status ENUM('completed', 'cancelled') NOT NULL DEFAULT 'completed',
      userId INT NOT NULL,
      notes TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `));

  console.log("Creating inventory_transfer_items...");
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS inventory_transfer_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      transferId INT NOT NULL,
      productId INT NOT NULL,
      quantity INT NOT NULL,
      productName VARCHAR(255),
      productUnit VARCHAR(50)
    )
  `));

  console.log("Done. Exiting.");
  process.exit(0);
}

run().catch(console.error);
