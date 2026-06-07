const { getDb } = require('../server/db');
const {
  productionBatches,
  productionInventory,
  productionOutputs,
  productionInputs,
  inventory,
  inventoryMovements
} = require('../../drizzle/schema');
const { eq } = require('drizzle-orm');

async function runValidation() {
  console.log('🚀 Iniciando validacion de logica de produccion...');
  const db = await getDb();
  if (!db) {
    console.error('❌ Error: No se pudo conectar a la base de datos');
    process.exit(1);
  }

  try {
    // 1. Crear Lote de Prueba
    console.log('\n1. Creando lote de prueba...');
    const batchNumber = `VAL-TEST-${Date.now()}`;
    const [batchResult] = await db.insert(productionBatches).values({
      batchNumber,
      type: 'kefir_production',
      status: 'in_progress',
      registeredBy: 1,
      notes: 'Lote de validacion automatica',
    });
    const batchId = batchResult.insertId;
    console.log(`✅ Lote creado: ${batchNumber} (ID: ${batchId})`);

    // 2. Definir Productos para la prueba (usando IDs comunes o buscando leche/insumos)
    // Buscamos un producto que sea 'milk' o 'finished_good'
    const products = await db.select().from(require('../../drizzle/schema').products);
    const milkProduct = products.find(p => p.name.toLowerCase().includes('leche') || p.productionRole === 'finished_good');
    const inputProduct = products.find(p => p.productionRole === 'milk' || p.name.toLowerCase().includes('insumo'));

    if (!milkProduct || !inputProduct) {
      throw new Error('No se encontraron productos de prueba adecuados (leche/insumos) en la base de datos');
    }

    console.log(`📦 Usando Producto Salida: ${milkProduct.name} (ID: ${milkProduct.id})`);
    console.log(`📦 Usando Insumo Entrada: ${inputProduct.name} (ID: ${inputProduct.id})`);

    // 3. Finalizar Lote (Sincronizar con la logica de production.ts)
    console.log('\n2. Finalizando lote y registrando stock...');

    // Actualizar estado del lote
    await db.update(productionBatches)
      .set({ status: 'completed', endDate: new Date() })
      .where(eq(productionBatches.id, batchId));

    const outputQty = 10;
    const inputQty = 5;

    // Registrar Output
    await db.insert(productionOutputs).values({
      batchId,
      productId: milkProduct.id,
      quantity: outputQty,
    });

    // Actualizar Inventario Produccion (Suma)
    const [existingProd] = await db.select().from(productionInventory).where(eq(productionInventory.productId, milkProduct.id));
    const oldProdQty = existingProd ? existingProd.quantity : 0;
    const newProdQty = oldProdQty + outputQty;

    if (existingProd) {
      await db.update(productionInventory).set({ quantity: newProdQty }).where(eq(productionInventory.id, existingProd.id));
    } else {
      await db.insert(productionInventory).values({ productId: milkProduct.id, quantity: outputQty });
    }

    // Registrar Input
    await db.insert(productionInputs).values({
      batchId,
      productId: inputProduct.id,
      quantity: inputQty,
    });

    // Deduct from General Inventory
    const [existingGen] = await db.select().from(inventory).where(eq(inventory.productId, inputProduct.id));
    if (existingGen) {
      await db.update(inventory).set({ quantity: Math.max(0, existingGen.quantity - inputQty) }).where(eq(inventory.id, existingGen.id));
    }

    // Registro de Movimiento
    await db.insert(inventoryMovements).values({
      productId: inputProduct.id,
      type: 'exit',
      quantity: inputQty,
      reason: `Consumo validacion lote #${batchNumber}`,
      userId: 1,
    });

    console.log(`✅ Lote #${batchNumber} completado con exito.`);

    // 4. Verificaciones Finales
    console.log('\n3. Verificando resultados finales...');

    const [finalProd] = await db.select().from(productionInventory).where(eq(productionInventory.productId, milkProduct.id));
    console.log(`📊 Stock Produccion ${milkProduct.name}: ${oldProdQty} -> ${finalProd.quantity} (Esperado: ${newProdQty})`);
    if (finalProd.quantity === newProdQty) console.log('✅ Stock Produccion CORRECTO');
    else console.error('❌ Stock Produccion INCORRECTO');

    const [finalGen] = await db.select().from(inventory).where(eq(inventory.productId, inputProduct.id));
    console.log(`📊 Stock General ${inputProduct.name}: ${existingGen?.quantity || 0} -> ${finalGen.quantity} (Esperado: ${Math.max(0, (existingGen?.quantity || 0) - inputQty)})`);
    if (finalGen.quantity === Math.max(0, (existingGen?.quantity || 0) - inputQty)) console.log('✅ Stock General CORRECTO');
    else console.error('❌ Stock General INCORRECTO');

    console.log('\n🚀 Validacion completada con exito.');
  } catch (error) {
    console.error('\n❌ ERROR DURANTE LA VALIDACION:');
    console.error(error);
    process.exit(1);
  }
}

runValidation();
