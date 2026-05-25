// Script para diagnosticar el problema de sincronización con Railway
// Hace login, obtiene el inventario real, y simula la sinc

const https = require('https');
const http = require('http');

function makeRequest(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };
    
    const req = lib.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ 
          status: res.statusCode, 
          headers: res.headers,
          body: data,
          cookies: res.headers['set-cookie']
        });
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const BASE = 'https://vitaliapedidos2-production-a969.up.railway.app';
  
  console.log('=== DIAGNOSTICO DE SINCRONIZACION KEFIRCONTROL ===\n');
  
  // 1. Login
  console.log('1. Haciendo login...');
  const loginRes = await makeRequest(`${BASE}/api/trpc/auth.loginTraditional`, { method: 'POST' }, {
    json: { username: 'admin', password: 'admin123' }
  });
  
  if (loginRes.status !== 200) {
    console.log('ERROR login:', loginRes.status, loginRes.body.substring(0, 200));
    return;
  }
  
  const cookieHeader = loginRes.headers['set-cookie'];
  const cookie = (Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader]).filter(Boolean).join('; ');
  console.log('Login OK. Cookie:', cookie ? cookie.substring(0, 60) + '...' : 'NINGUNA');
  
  // 2. Obtener inventario real
  console.log('\n2. Obteniendo inventario real de Railway...');
  const invRes = await makeRequest(
    `${BASE}/api/trpc/inventory.listInventory`,
    { headers: { cookie } }
  );
  
  let inventory = [];
  try {
    const parsed = JSON.parse(invRes.body);
    inventory = parsed.result?.data?.json || parsed.result?.data || [];
    console.log(`   Total items en inventario: ${inventory.length}`);
    
    // Buscar queso y suero
    const queso = inventory.filter(i => 
      (i.product?.name || '').toLowerCase().includes('queso') || 
      (i.product?.name || '').toLowerCase().includes('labneh')
    );
    const suero = inventory.filter(i => 
      (i.product?.name || '').toLowerCase().includes('suero')
    );
    
    console.log(`   Queso/Labneh encontrados: ${queso.length}`);
    queso.forEach(q => console.log(`     - ID:${q.productId} "${q.product?.name}" qty:${q.quantity} cat:${q.product?.category}`));
    
    console.log(`   Suero encontrados: ${suero.length}`);
    suero.forEach(s => console.log(`     - ID:${s.productId} "${s.product?.name}" qty:${s.quantity} cat:${s.product?.category}`));
    
    console.log('\n   Todos los productos finished_product:');
    inventory
      .filter(i => i.product?.category === 'finished_product')
      .forEach(i => console.log(`     - ID:${i.productId} "${i.product?.name}" qty:${i.quantity}`));
      
  } catch (e) {
    console.log('ERROR parsing inventory:', invRes.body.substring(0, 300));
    return;
  }
  
  // 3. Intentar crear producto Queso manualmente via tRPC
  console.log('\n3. Intentando crear "Queso Labneh Natural 250g" via tRPC...');
  const createRes = await makeRequest(
    `${BASE}/api/trpc/inventory.createProduct`,
    { method: 'POST', headers: { cookie } },
    {
      json: true,
      "0": {
        code: "KEF-LABNEH-TEST",
        name: "Queso Labneh Natural 250g TEST",
        category: "finished_product",
        price: 4.5,
        salePrice: 4.5,
        unit: "unidad",
        productionRole: "finished_good",
        presentationWeightGr: 250,
        presentationVolumeMl: 0
      }
    }
  );
  console.log('   Status:', createRes.status);
  console.log('   Respuesta:', createRes.body.substring(0, 400));
  
  // 4. Intentar updateQuantity
  if (inventory.length > 0) {
    const firstProduct = inventory[0];
    console.log(`\n4. Intentando updateQuantity para productId=${firstProduct.productId}...`);
    const updateRes = await makeRequest(
      `${BASE}/api/trpc/inventory.updateQuantity`,
      { method: 'POST', headers: { cookie } },
      {
        productId: firstProduct.productId,
        quantity: 0,
        reason: "Test diagnostico",
        type: "adjustment"
      }
    );
    console.log('   Status:', updateRes.status);
    console.log('   Respuesta:', updateRes.body.substring(0, 400));
  }
}

main().catch(console.error);
