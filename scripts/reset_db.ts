import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema.js';
import { ne } from 'drizzle-orm';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

async function reset() {
  const mockFile = path.join(process.cwd(), "server", "demo_data.json");
  
  if (!databaseUrl) {
    console.log("No DATABASE_URL found. Running in Demo Mode reset...");
    if (fs.existsSync(mockFile)) {
      fs.unlinkSync(mockFile);
      console.log("demo_data.json deleted.");
    } else {
      console.log("No demo_data.json found to delete.");
    }
    return;
  }

  console.log("Connecting to database:", databaseUrl.split('@').pop()); // Log only the host part
  const connection = await mysql.createConnection(databaseUrl);
  const db = drizzle(connection);

  console.log("Resetting database tables...");

  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    const tables = [
      "sessions",
      "orderItems",
      "orders",
      "payments",
      "purchaseItems",
      "purchases",
      "inventoryMovements",
      "inventory",
      "financialTransactions",
      "gpsTracking",
      "cash_closures",
      "cash_openings",
      "saleItems",
      "sales",
      "auditLog",
      "quotationItems",
      "quotations",
      "deliveryExpenses",
      "operationalExpenses",
      "accountsPayable",
      "suppliers",
      "customers",
      "products",
    ];

    for (const tableName of tables) {
      console.log(`Truncating ${tableName}...`);
      await connection.query(`TRUNCATE TABLE ${tableName}`);
    }

    console.log("Cleaning users (keeping admin)...");
    // We use a raw query here to avoid complex schema imports in this standalone script
    await connection.query(`DELETE FROM users WHERE role != 'admin'`);
    
    // Check if at least one admin exists, if not, we shouldn't have deleted everything but just in case
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
    if ((rows as any)[0].count === 0) {
      console.log("No admin found. Please ensure you have an admin user.");
    } else {
      console.log(`Kept ${(rows as any)[0].count} admin user(s).`);
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    // Also clean demo_data.json
    if (fs.existsSync(mockFile)) {
      fs.unlinkSync(mockFile);
      console.log("demo_data.json deleted.");
    }

    console.log("Database reset complete.");
  } catch (error) {
    console.error("Error resetting database:", error);
  } finally {
    await connection.end();
  }
}

reset().catch(console.error);
