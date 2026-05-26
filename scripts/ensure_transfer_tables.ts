import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Ensuring new tables...");
  const db = await getDb();
  if (!db) return;
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS inventory_transfers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      transferNumber VARCHAR(50) NOT NULL UNIQUE,
      direction ENUM('to_production', 'to_general') NOT NULL,
      status ENUM('completed', 'cancelled') NOT NULL DEFAULT 'completed',
      userId INT NOT NULL,
      notes TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS inventory_transfer_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      transferId INT NOT NULL,
      productId INT NOT NULL,
      quantity INT NOT NULL,
      productName VARCHAR(255),
      productUnit VARCHAR(20),
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);
  
  console.log("Done.");
  process.exit(0);
}

main().catch(console.error);
