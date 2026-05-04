import mysql from 'mysql2/promise';

async function analyzeQR() {
  const connectionString = 'mysql://root:IWsffpKZIuiMhDZlJhcLYNEDpjfbyymC@shortline.proxy.rlwy.net:25975/railway';
  let connection;
  try {
    connection = await mysql.createConnection(connectionString);
    
    const [rows] = await connection.execute(
      "SELECT id, type, category, amount, notes, paymentMethod, createdAt FROM financialTransactions WHERE paymentMethod = 'qr' ORDER BY createdAt ASC"
    );

    let ingresos = 0;
    let egresos = 0;

    console.log("Transacciones QR:");
    for (const tx of rows) {
      if (tx.type === 'income') ingresos += tx.amount;
      if (tx.type === 'expense') egresos += tx.amount;
      
      const amtStr = (tx.amount / 100).toFixed(2);
      const sign = tx.type === 'income' ? '+' : '-';
      console.log(`[${tx.id}] ${tx.createdAt.toISOString()} | ${tx.category} | ${tx.notes} | ${sign}${amtStr}`);
    }

    console.log(`\nIngresos Totales: ${(ingresos / 100).toFixed(2)}`);
    console.log(`Egresos Totales: ${(egresos / 100).toFixed(2)}`);
    console.log(`Saldo QR: ${((ingresos - egresos) / 100).toFixed(2)}`);

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.end();
  }
}

analyzeQR();
