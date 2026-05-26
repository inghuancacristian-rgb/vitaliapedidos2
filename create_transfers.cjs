const mysql = require('mysql2/promise');
require('dotenv').config();

async function createTables() {
  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    console.log("Connected to DB");

    await connection.execute(`
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
    console.log("Created inventory_transfers table");

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS inventory_transfer_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transferId INT NOT NULL,
        productId INT NOT NULL,
        quantity INT NOT NULL,
        productName VARCHAR(255),
        productUnit VARCHAR(50)
      )
    `);
    console.log("Created inventory_transfer_items table");

    await connection.end();
    console.log("Done");
  } catch (err) {
    console.error(err);
  }
}

createTables();
