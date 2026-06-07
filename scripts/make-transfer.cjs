const mysql = require('mysql2/promise');

async function makeTransfer() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  
  console.log('Connecting to database...');
  const pool = mysql.createPool(dbUrl);
  
  try {
    // Verificar first
    const [rows] = await pool.execute('SELECT 1 as test');
    console.log('Connected! Test:', rows);
    
    // Verificar tables
    const [tables] = await pool.execute('SHOW TABLES');
    console.log('Tables:', tables);
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

makeTransfer();
