import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL || 'mysql://root:IWsffpKZIuiMhDZlJhcLYNEDpjfbyymC@shortline.proxy.rlwy.net:25975/railway';

async function cleanup() {
  console.log("Iniciando limpieza de duplicados en reportes de cierre...");
  let connection;
  try {
    connection = await mysql.createConnection(connectionString);
    
    // Obtener todas las transacciones de closure_report
    const [rows] = await connection.execute(
      "SELECT id, notes, paymentMethod, createdAt FROM financialTransactions WHERE category = 'closure_report' ORDER BY createdAt ASC"
    );

    const seenNotes = new Map();
    const toDelete = [];

    for (const tx of rows) {
      const key = (tx.notes || "") + "|" + tx.paymentMethod;
      if (seenNotes.has(key)) {
        toDelete.push(tx.id);
      } else {
        seenNotes.set(key, tx.id);
      }
    }

    console.log(`Encontrados ${toDelete.length} duplicados.`);

    for (const id of toDelete) {
      await connection.execute("DELETE FROM financialTransactions WHERE id = ?", [id]);
      console.log(`Eliminado duplicado ID: ${id}`);
    }

    console.log("Limpieza completada.");
  } catch (error) {
    console.error("Error durante la limpieza:", error);
  } finally {
    if (connection) await connection.end();
  }
}

cleanup();
