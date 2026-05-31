const mysql = require('mysql2/promise');
const fs = require('fs');

async function debug() {
  // Leemos el .env para obtener DATABASE_URL
  const envContent = fs.readFileSync('.env', 'utf8');
  const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
  const dbUrl = dbUrlMatch ? dbUrlMatch[1] : null;

  if (!dbUrl) {
    console.error('DATABASE_URL not found in .env');
    process.exit(1);
  }

  console.log('DATABASE_URL:', dbUrl.substring(0, 30) + '...');
  console.log('Connecting...');

  const pool = mysql.createPool(dbUrl);

  try {
    // Verificar tabla production_inventory
    console.log('\n=== production_inventory ===');
    const [prodRows] = await pool.execute('SELECT * FROM production_inventory');
    console.log('Rows:', prodRows.length);
    console.log(prodRows);

    // Verificar tabla inventory_transfer_items
    console.log('\n=== inventory_transfer_items ===');
    const [transferRows] = await pool.execute('SELECT * FROM inventory_transfer_items');
    console.log('Rows:', transferRows.length);
    console.log(transferRows);

    // Verificar products con categoría relevante
    console.log('\n=== products (raw_material, insumo, supplies) ===');
    const [products] = await pool.execute(
      'SELECT id, name, category, unit, price, productionRole FROM products WHERE category IN ("raw_material", "insumo", "supplies")'
    );
    console.log('Rows:', products.length);
    console.log(products);

    // Verificar inventory_transfers
    console.log('\n=== inventory_transfers ===');
    const [transfers] = await pool.execute('SELECT * FROM inventory_transfers ORDER BY id DESC LIMIT 5');
    console.log('Rows:', transfers.length);
    console.log(transfers);

    // Verificar kefir_storage
    console.log('\n=== kefir_storage ===');
    const [kefirRows] = await pool.execute('SELECT * FROM kefir_storage');
    console.log('Rows:', kefirRows.length);
    console.log(kefirRows);

  } catch (e) {
    console.error('Error:', e.message);
    console.error(e);
  } finally {
    await pool.end();
  }
}

debug();
