import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { financialTransactions } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function fix() {
  console.log("Connecting to DB...");
  const connection = await mysql.createConnection("mysql://root:IWsffpKZIuiMhDZlJhcLYNEDpjfbyymC@shortline.proxy.rlwy.net:25975/railway");
  const db = drizzle(connection);
  
  // 1. Delete the bad transactions
  await db.delete(financialTransactions).where(eq(financialTransactions.id, 1));
  await db.delete(financialTransactions).where(eq(financialTransactions.id, 2));
  
  // 2. Insert the correct transactions (55.00 Bs = 5500 cents)
  // expense QR
  await db.insert(financialTransactions).values({
    type: 'expense',
    category: 'transfer_between_registers',
    paymentMethod: 'qr',
    amount: 5500, // 55 Bs
    userId: 1,
    referenceId: null,
    notes: 'Traspaso hacia TRANSFER - DEUDA CLIENTE (Corregido)',
    createdAt: new Date()
  });

  // income Transfer
  await db.insert(financialTransactions).values({
    type: 'income',
    category: 'transfer_between_registers',
    paymentMethod: 'transfer',
    amount: 5500, // 55 Bs
    userId: 1,
    referenceId: null,
    notes: 'Traspaso desde QR - DEUDA CLIENTE (Corregido)',
    createdAt: new Date()
  });

  console.log("Fix applied!");
  
  await connection.end();
  process.exit(0);
}

fix().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
