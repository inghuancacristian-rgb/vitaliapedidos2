
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function testPool() {
  try {
    const pool = mysql.createPool(process.env.DATABASE_URL!);
    console.log("Pool created");
    const connection = await pool.getConnection();
    console.log("Got connection");
    const [rows] = await connection.query("SELECT 1 + 1 AS solution");
    console.log("Query result:", rows);
    connection.release();
    process.exit(0);
  } catch (err) {
    console.error("Pool failed:", err);
    process.exit(1);
  }
}

testPool();
