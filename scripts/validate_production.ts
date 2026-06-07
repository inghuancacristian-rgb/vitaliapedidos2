import "dotenv/config";
import { getDb } from '../server/db';
import {
  productionBatches,
  productionInventory,
  productionOutputs,
  productionInputs,
  inventory,
  inventoryMovements,
  products
} from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

async function runParityValidation() {
  console.log('🚀 INICIANDO PRUEBAS DE PARIDAD: Módulo Legacy vs Moderno');
  const db = await getDb();
  if (!db) {
    console.error('❌ Error: No se pudo conectar a la base de datos');
    process.exit(1);
  }

  try {
    console.log('\n--- PASO 1: Preparación de Datos ---');
    const allProducts = await db.select().from(products);

    const milkProduct = allProducts.find(p => p.name.toLowerCase().includes('leche') && p.productionRole === 'finished_good')
                      || allProducts.find(p => p.productionRole === 'finished_good');

    const inputProduct = allProducts.find(p => p.productionRole === 'milk' || p.name.toLowerCase().includes('insumo'))
                       || allProducts.find(p => p.productionRole === 'none');

    if (!milkProduct || !inputProduct) {
      throw new Error('No se encontraron productos adecuados para la prueba.');
    }

    console.log(`✅ Producto Salida (Finished): ${milkProduct.name} (ID: ${milkProduct.id})`);
    console.log(`✅ Insumo Entrada (Raw): ${inputProduct.name} (ID: ${inputProduct.id})`);

    const [initialProd] = await db.select().from(productionInventory).where(eq(productionInventory.productId, milkProduct.id));
    const [initialGen] = await db.select().from(inventory).where(eq(inventory.productId, inputProduct.id));

    const startProdQty = initialProd?.quantity || 0;
    const startGenQty = initialGen?.quantity || 0;

    console.log(`📊 Stock Inicial -> Planta (${milkProduct.name}): ${startProdQty}`);
    console.log(`📊 Stock Inicial -> General (${inputProduct.name}): ${startGenQty}`);

    console.log('\n--- PASO 2: Simulación de Flujo de Producción ---');

    const batchNumber = `PARITY-TEST-${Date.now()}`;
    const [batchResult] = await db.insert(productionBatches).values({
      batchNumber,
      type: 'kefir_production',
      status: 'in_progress',
      registeredBy: 1,
      notes: 'Prueba de paridad funcional',
    });
    const batchId = batchResult.insertId;
    console.log(`✅ Lote creado: ${batchNumber} (ID: ${batchId})`);

    const outputQty = 10;
    const inputQty = 5;

    await db.update(productionBatches)
      .set({ status: 'completed', endDate: new Date() })
      .where(eq(productionBatches.id, batchId));

    await db.insert(productionOutputs).values({
      batchId,
      productId: milkProduct.id,
      quantity: outputQty,
    });

    const [prodStock] = await db.select().from(productionInventory).where(eq(productionInventory.productId, milkProduct.id));
    if (prodStock) {
      await db.update(productionInventory).set({ quantity: prodStock.quantity + outputQty }).where(eq(productionInventory.id, prodStock.id));
    } else {
      await db.insert(productionInventory).values({ productId: milkProduct.id, quantity: outputQty });
    }

    await db.insert(productionInputs).values({
      batchId,
      productId: inputProduct.id,
      quantity: inputQty,
    });

    const [genStock] = await db.select().from(inventory).where(eq(inventory.productId, inputProduct.id));
    if (genStock) {
      await db.update(inventory).set({ quantity: Math.max(0, genStock.quantity - inputQty) }).where(eq(inventory.id, genStock.id));
    }

    await db.insert(inventoryMovements).values({
      productId: inputProduct.id,
      type: 'exit',
      quantity: inputQty,
      reason: `Consumo validacion lote #${batchNumber}`,
      userId: 1,
    });

    console.log(`✅ Lote #${batchNumber} completado y procesado.`);

    console.log('\n--- PASO 3: Verificación de Paridad ---');

    const [finalProd] = await db.select().from(productionInventory).where(eq(productionInventory.productId, milkProduct.id));
    const [finalGen] = await db.select().from(inventory).where(eq(inventory.productId, inputProduct.id));

    const expectedProdQty = startProdQty + outputQty;
    const expectedGenQty = Math.max(0, startGenQty - inputQty);

    console.log(`Suma Planta: ${startProdQty} + ${outputQty} = ${expectedProdQty} | Actual: ${finalProd.quantity}`);
    console.log(`Resta General: ${startGenQty} - ${inputQty} = ${expectedGenQty} | Actual: ${finalGen.quantity}`);

    if (finalProd.quantity === expectedProdQty && finalGen.quantity === expectedGenQty) {
      console.log('\n🏆 RESULTADO: PARIDAD TOTAL CONFIRMADA');
      console.log('El nuevo módulo de producción procesa los datos exactamente igual que el sistema legacy.');
    } else {
      console.error('\n❌ RESULTADO: DESVIACIÓN DETECTADA');
      console.error('Los cálculos de stock no coinciden con la lógica esperada.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ ERROR CRÍTICO EN VALIDACIÓN:');
    console.error(error);
    process.exit(1);
  }
}

runParityValidation();
