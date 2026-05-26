import "dotenv/config";
import mysql from "mysql2/promise";

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("No URL");
  
  const sslUrl = url.includes("ssl=") ? url : (url.includes("?") ? `${url}&ssl={"rejectUnauthorized":false}` : `${url}?ssl={"rejectUnauthorized":false}`);
  
  console.log("Connecting with SSL config...");
  const conn = await mysql.createConnection(sslUrl);
  console.log("Connected. Running query...");
  try {
    console.log("Trying to list tables...");
    const [tables] = await conn.query("SHOW TABLES");
    console.log("Tables:");

    console.log("Creating table...");
    await conn.query(`
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
    console.log("Created inventory_transfers.");

    await conn.query(`
      CREATE TABLE IF NOT EXISTS inventory_transfer_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transferId INT NOT NULL,
        productId INT NOT NULL,
        quantity INT NOT NULL,
        productName VARCHAR(255),
        productUnit VARCHAR(50)
      )
    `);
    console.log("Created inventory_transfer_items.");
  } catch (err) {
    console.error("Query Error:", err);
  } finally {
    await conn.end();
  }
}
run().catch(e => console.error("Outer Error:", e));
