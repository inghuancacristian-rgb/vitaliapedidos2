import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const hash = await bcrypt.hash('password', 10);
  await connection.query(`UPDATE users SET password = ? WHERE id = 11`, [hash]);
  console.log('Password for user Cristian (id=11) reset to: password');
  await connection.end();
}

run().catch(console.error);
