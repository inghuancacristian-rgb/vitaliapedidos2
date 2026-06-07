const mysql = require('mysql2/promise');

async function makeTransfer() {
  // Usar DATABASE_URL del entorno
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  
  const pool = mysql.createPool(dbUrl);
  
  try {
    // Obtener un producto de materia prima o insumo
    const [products] = await pool.execute(
      'SELECT id, name, category, unit, price FROM products WHERE category IN ("raw_material", "insumo", "supplies") LIMIT 5'
    );
    
    if (products.length === 0) {
      console.log('No products found in raw_material, insumo, or supplies');
      return;
    }
    
    const product = products[0];
    console.log('Using product:', product);
    
    // Crear traspaso
    const [transferResult] = await pool.execute(
      'INSERT INTO inventory_transfers (transferNumber, direction, status, userId, createdAt) VALUES (?, "to_production", "completed", 1, NOW())',
      ['TR-' + new Date().getFullYear() + '-TEST']
    );
    
    const transferId = transferResult.insertId;
    console.log('Created transfer ID:', transferId);
    
    // Crear item de traspaso
    await pool.execute(
      'INSERT INTO inventory_transfer_items (transferId, productId, quantity, productName, productUnit) VALUES (?, ?, ?, ?, ?)',
      [transferId, product.id, 10, product.name, product.unit || 'uds']
    );
    
    console.log('Created transfer item');
    
    // Verificar
    const [transferItems] = await pool.execute(
      'SELECT * FROM inventory_transfer_items WHERE transferId = ?',
      [transferId]
    );
    console.log('Verification - transfer_items:', transferItems);
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

makeTransfer();
