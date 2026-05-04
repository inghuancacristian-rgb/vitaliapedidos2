import mysql from 'mysql2/promise';

async function analyzeCash() {
  const connectionString = 'mysql://root:IWsffpKZIuiMhDZlJhcLYNEDpjfbyymC@shortline.proxy.rlwy.net:25975/railway';
  let connection;
  try {
    connection = await mysql.createConnection(connectionString);
    
    const [rows] = await connection.execute(
      "SELECT id, type, category, amount, notes, paymentMethod, createdAt FROM financialTransactions WHERE paymentMethod = 'cash' ORDER BY createdAt DESC LIMIT 20"
    );

    let ingresos = 0;
    let egresos = 0;

    console.log("Últimas transacciones en Efectivo:");
    for (const tx of rows) {
      if (tx.type === 'income') ingresos += tx.amount;
      if (tx.type === 'expense') egresos += tx.amount;
      
      const amtStr = (tx.amount / 100).toFixed(2);
      const sign = tx.type === 'income' ? '+' : '-';
      console.log(`[${tx.id}] ${tx.createdAt.toISOString()} | ${tx.type} | ${tx.category} | ${tx.notes} | ${sign}${amtStr}`);
    }

    console.log(`\nIngresos (limit 20): ${(ingresos / 100).toFixed(2)}`);
    console.log(`Egresos (limit 20): ${(egresos / 100).toFixed(2)}`);
    console.log(`Saldo (limit 20): ${((ingresos - egresos) / 100).toFixed(2)}`);

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.end();
  }
}

analyzeCash();
