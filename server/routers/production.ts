import { z } from 'zod';
import { router, publicProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { 
  productionBatches, 
  productionOutputs, 
  productionInputs,
  productionInventory,
  inventoryTransfers,
  inventoryTransferItems,
  inventory, 
  inventoryMovements, 
  users, 
  products 
} from '../../drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const productionRouter = router({
  getBatches: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const batches = await db
      .select({
        id: productionBatches.id,
        batchNumber: productionBatches.batchNumber,
        type: productionBatches.type,
        status: productionBatches.status,
        startDate: productionBatches.startDate,
        endDate: productionBatches.endDate,
        registeredBy: productionBatches.registeredBy,
        createdAt: productionBatches.createdAt,
        operatorName: users.username,
      })
      .from(productionBatches)
      .leftJoin(users, eq(productionBatches.registeredBy, users.id))
      .orderBy(desc(productionBatches.createdAt));
    return batches;
  }),

  createBatch: publicProcedure
    .input(z.object({
      type: z.enum(['kefir_production', 'nodule_washing', 'maintenance']),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      // @ts-ignore
      const userId = ctx.user?.id || 1; 

      const countResult = await db.select({ id: productionBatches.id }).from(productionBatches);
      const nextId = countResult.length + 1;
      const prefix = input.type === 'kefir_production' ? 'ELAB' : 'LAV';
      const batchNumber = `${prefix}-${String(nextId).padStart(4, '0')}`;

      const [result] = await db.insert(productionBatches).values({
        batchNumber,
        type: input.type,
        status: 'in_progress',
        registeredBy: userId,
        notes: input.notes,
      });

      return { success: true, batchId: result.insertId, batchNumber };
    }),

  completeBatch: publicProcedure
    .input(z.object({
      batchId: z.number(),
      outputs: z.array(z.object({
        productId: z.number(),
        quantity: z.number(),
      })),
      inputs: z.array(z.object({
        productId: z.number(),
        quantity: z.number(),
      })).optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const pool = (db as any).session?.client || (global as any)._pool;

      // @ts-ignore
      const userId = ctx.user?.id || 1;

      // Update batch status
      await db.update(productionBatches)
        .set({ status: 'completed', endDate: new Date() })
        .where(eq(productionBatches.id, input.batchId));

      const productsData = await db.select().from(products);

      // Process Inputs (Raw Materials Consumed)
      if (input.inputs && input.inputs.length > 0) {
        for (const inputItem of input.inputs) {
          await db.insert(productionInputs).values({
            batchId: input.batchId,
            productId: inputItem.productId,
            quantity: inputItem.quantity,
          });

          // Deduct from general inventory
          const [existingStock] = await db.select().from(inventory).where(eq(inventory.productId, inputItem.productId));
          if (existingStock) {
            await db.update(inventory)
              .set({ quantity: Math.max(0, existingStock.quantity - inputItem.quantity) })
              .where(eq(inventory.id, existingStock.id));
          }

          // Record inventory movement
          await db.insert(inventoryMovements).values({
            productId: inputItem.productId,
            type: 'exit',
            quantity: inputItem.quantity,
            reason: `Consumo en lote #${input.batchId}`,
            userId: userId,
          });
        }
      }

      // Process Outputs (Finished Goods Produced)
      for (const output of input.outputs) {
        const product = productsData.find((p: any) => p.id === output.productId);

        // Record output
        await db.insert(productionOutputs).values({
          batchId: input.batchId,
          productId: output.productId,
          quantity: output.quantity,
        });

        // Add to production inventory (Almacén de Planta)
        const [existingStock] = await db.select().from(productionInventory).where(eq(productionInventory.productId, output.productId));
        
        let previousQty = 0;
        let newQty = output.quantity;

        if (existingStock) {
          previousQty = existingStock.quantity;
          newQty = existingStock.quantity + output.quantity;
          await db.update(productionInventory)
            .set({ quantity: newQty })
            .where(eq(productionInventory.id, existingStock.id));
        } else {
          await db.insert(productionInventory).values({
            productId: output.productId,
            quantity: output.quantity,
          });
        }

        // Registrar en Kardex de Planta (kefir_movements)
        if (pool && product) {
          await pool.execute(
            'INSERT INTO kefir_movements (productId, productName, category, previousQuantity, newQuantity, changeAmount, reason) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              product.id.toString(),
              product.name,
              product.category,
              previousQty,
              newQty,
              output.quantity,
              `Ingreso Lote #${input.batchId}`
            ]
          ).catch(console.error);
        }
      }

      return { success: true };
    }),

  getBatchDetails: publicProcedure
    .input(z.object({ batchId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { outputs: [], inputs: [] };
      
      const outputs = await db
        .select({
          id: productionOutputs.id,
          productId: productionOutputs.productId,
          quantity: productionOutputs.quantity,
          productName: products.name,
        })
        .from(productionOutputs)
        .innerJoin(products, eq(productionOutputs.productId, products.id))
        .where(eq(productionOutputs.batchId, input.batchId));
        
      const inputs = await db
        .select({
          id: productionInputs.id,
          productId: productionInputs.productId,
          quantity: productionInputs.quantity,
          productName: products.name,
        })
        .from(productionInputs)
        .innerJoin(products, eq(productionInputs.productId, products.id))
        .where(eq(productionInputs.batchId, input.batchId));
        
      return { outputs, inputs };
    }),

  getProductionInventory: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const items = await db
      .select({
        id: productionInventory.id,
        productId: productionInventory.productId,
        quantity: productionInventory.quantity,
        lastUpdated: productionInventory.lastUpdated,
        productName: products.name,
        productCode: products.code,
        category: products.category,
        unit: products.unit,
        salePrice: products.salePrice,
        presentationQuantity: products.presentationQuantity,
        presentationUnit: products.presentationUnit,
        presentationVolumeMl: products.presentationVolumeMl,
        presentationWeightGr: products.presentationWeightGr,
        productionRole: products.productionRole,
      })
      .from(productionInventory)
      .innerJoin(products, eq(productionInventory.productId, products.id));

    if (items.length > 0) {
      return items;
    }

    const transferRows = await db
      .select({
        productId: inventoryTransferItems.productId,
        quantity: inventoryTransferItems.quantity,
        productName: products.name,
        productCode: products.code,
        category: products.category,
        unit: products.unit,
        salePrice: products.salePrice,
        presentationQuantity: products.presentationQuantity,
        presentationUnit: products.presentationUnit,
        presentationVolumeMl: products.presentationVolumeMl,
        presentationWeightGr: products.presentationWeightGr,
        productionRole: products.productionRole,
      })
      .from(inventoryTransferItems)
      .innerJoin(inventoryTransfers, eq(inventoryTransferItems.transferId, inventoryTransfers.id))
      .innerJoin(products, eq(inventoryTransferItems.productId, products.id))
      .where(and(
        eq(inventoryTransfers.direction, 'to_production'),
        eq(inventoryTransfers.status, 'completed')
      ));

    const aggregate = new Map<number, any>();
    for (const row of transferRows) {
      const current = aggregate.get(row.productId) || {
        id: `transfer-${row.productId}`,
        productId: row.productId,
        quantity: 0,
        lastUpdated: null,
        productName: row.productName,
        productCode: row.productCode,
        category: row.category,
        unit: row.unit,
        salePrice: row.salePrice,
        presentationQuantity: row.presentationQuantity,
        presentationUnit: row.presentationUnit,
        presentationVolumeMl: row.presentationVolumeMl,
        presentationWeightGr: row.presentationWeightGr,
        productionRole: row.productionRole,
      };
      current.quantity += row.quantity;
      aggregate.set(row.productId, current);
    }

    return Array.from(aggregate.values());
  }),

  // Mantenemos el endpoint de Kardex intacto
  getKefirMovements: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    
    const pool = (db as any).session?.client || (global as any)._pool;
    if (!pool) return [];
    
    try {
      const [rows] = await pool.execute('SELECT * FROM kefir_movements ORDER BY createdAt DESC');
      return rows as any[];
    } catch (e) {
      console.error("Error getting kefir movements:", e);
      return [];
    }
  }),

  migrateLocalData: publicProcedure
    .input(z.object({
      inventory: z.array(z.object({
        name: z.string(),
        quantity: z.number(),
        category: z.string().optional(),
        unit: z.string().optional(),
      })),
      batches: z.array(z.object({
        id: z.string(),
        type: z.string().optional(),
        status: z.string().optional(),
        date: z.string().optional(),
        notes: z.string().optional(),
      })).optional(),
      products: z.array(z.object({
        id: z.string().optional(),
        name: z.string(),
        sellPrice: z.number().optional(),
        unit: z.string().optional(),
        volume: z.number().optional(),
        flavor: z.string().optional(),
        type: z.string().optional(),
      })).optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: "No hay conexión con la base de datos" });

      const productsData = await db.select().from(products);

      // 0. Sincronizar Catálogo de Productos
      if (input.products && input.products.length > 0) {
        for (const localProduct of input.products) {
          const nameLower = localProduct.name.toLowerCase().trim();
          let matched = productsData.find((p: any) => p.name.toLowerCase().trim() === nameLower);

          if (!matched) {
            // No existe el producto en el catálogo SQL, lo creamos de forma automática
            const code = localProduct.id && localProduct.id.startsWith("PROD-") 
              ? localProduct.id 
              : `PROD-${String(productsData.length + 1).padStart(3, '0')}`;
              
            const salePrice = localProduct.sellPrice || 0;
            const volumeMl = localProduct.volume || (localProduct.name.toLowerCase().includes("1l") ? 1000 : 500);
            const presUnit = localProduct.unit || "ml";

            try {
              const pool = (db as any).session?.client || (global as any)._pool;
              if (pool) {
                const sqlInsert = `
                  INSERT INTO products (code, name, category, price, salePrice, wholesalePrice, discountPrice,
                    wholesaleDiscountType, wholesaleDiscountValue, unit, presentationQuantity, presentationUnit,
                    presentationVolumeMl, presentationWeightGr, productionRole, storageLocation, supplierName,
                    productionNotes, status, imageUrl)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                const params = [
                  code,
                  localProduct.name,
                  "finished_product",
                  0, // price
                  Math.round(salePrice * 100), // salePrice en centavos
                  Math.round(salePrice * 100), // wholesalePrice
                  Math.round(salePrice * 100), // discountPrice
                  "percentage",
                  0,
                  "unidad",
                  1,
                  presUnit,
                  presUnit === "ml" ? volumeMl : 0,
                  presUnit === "g" ? volumeMl : 0,
                  "finished_good",
                  "Inventario General",
                  "Producción",
                  "Creado automáticamente en la sincronización de producción",
                  "active",
                  null
                ];

                console.log("[DB Migration] Auto-creating product in SQL:", localProduct.name, "SKU:", code);
                const [resInsert] = await pool.execute(sqlInsert, params) as any;
                const newProductId = resInsert?.insertId;

                if (newProductId) {
                  // Crear automáticamente el registro en la tabla de inventario general con stock 0
                  await pool.execute(
                    `INSERT INTO inventory (productId, quantity, minStock) VALUES (?, 0, 5)`,
                    [newProductId]
                  );
                  
                  // Agregar el producto recién creado a productsData en memoria
                  productsData.push({
                    id: newProductId,
                    code,
                    name: localProduct.name,
                    category: "finished_product",
                    unit: "unidad",
                    presentationQuantity: 1,
                    presentationUnit: presUnit,
                    presentationVolumeMl: presUnit === "ml" ? volumeMl : 0,
                    presentationWeightGr: presUnit === "g" ? volumeMl : 0,
                    productionRole: "finished_good"
                  });
                }
              }
            } catch (err) {
              console.error("[DB Migration] Error auto-creating product:", localProduct.name, err);
            }
          }
        }
      }

      // 1. Sincronizar Inventario de Planta
      for (const item of input.inventory) {
        if (item.quantity < 0) continue;

        const nameLower = item.name.toLowerCase().trim();
        const matchedProduct = productsData.find((p: any) => p.name.toLowerCase().trim() === nameLower);

        if (matchedProduct) {
          const [existingStock] = await db.select().from(productionInventory).where(eq(productionInventory.productId, matchedProduct.id));
          if (existingStock) {
            await db.update(productionInventory)
              .set({ quantity: item.quantity, lastUpdated: new Date() })
              .where(eq(productionInventory.id, existingStock.id));
          } else {
            await db.insert(productionInventory).values({
              productId: matchedProduct.id,
              quantity: item.quantity,
            });
          }

          // Registrar el cambio en kefir_movements para que aparezca en el Kardex
          const pool = (db as any).session?.client || (global as any)._pool;
          if (pool) {
            await pool.execute(
              'INSERT INTO kefir_movements (productId, productName, category, previousQuantity, newQuantity, changeAmount, reason) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [
                matchedProduct.id.toString(),
                matchedProduct.name,
                matchedProduct.category,
                0,
                item.quantity,
                item.quantity,
                'Sincronización inicial desde navegador'
              ]
            ).catch(console.error);
          }
        }
      }

      // 2. Sincronizar Lotes
      if (input.batches && input.batches.length > 0) {
        // @ts-ignore
        const userId = ctx.user?.id || 1;
        for (const batch of input.batches) {
          const batchNumber = batch.id || `ELAB-MIG-${Math.floor(Math.random() * 1000)}`;
          const [existingBatch] = await db.select().from(productionBatches).where(eq(productionBatches.batchNumber, batchNumber));
          if (!existingBatch) {
            const batchType = batch.type === 'lavado' || batch.type === 'nodule_washing' ? 'nodule_washing' : 'kefir_production';
            const batchStatus = batch.status === 'completado' || batch.status === 'completed' ? 'completed' : 'in_progress';
            await db.insert(productionBatches).values({
              batchNumber,
              type: batchType,
              status: batchStatus,
              startDate: batch.date ? new Date(batch.date) : new Date(),
              endDate: batchStatus === 'completed' ? new Date() : null,
              registeredBy: userId,
              notes: batch.notes || 'Migrado desde localstorage del navegador',
            });
          }
        }
      }

      return { success: true };
    }),

  // ==========================================
  // LEGACY ENDPOINTS (Backward Compatibility)
  // Para clientes antiguos que tengan el caché del navegador sin actualizar
  // ==========================================
  getKefirStorage: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    try {
      // 1. Obtener el estado real actual del inventario de producción desde la tabla estructurada
      const items = await db
        .select({
          id: productionInventory.productId,
          name: products.name,
          quantity: productionInventory.quantity,
          unit: products.unit,
          minStock: 5, // Valor por defecto
          category: products.category,
          costPerUnit: products.price,
          presentationQuantity: products.presentationQuantity,
          presentationUnit: products.presentationUnit,
          presentationVolumeMl: products.presentationVolumeMl,
          presentationWeightGr: products.presentationWeightGr,
          productionRole: products.productionRole,
        })
        .from(productionInventory)
        .innerJoin(products, eq(productionInventory.productId, products.id));

      // 2. Formatear los datos como el JSON que el módulo de Kefir espera (kefir_inventory_v3)
      const inventoryJson = JSON.stringify(items);

      // Retornamos un objeto que simula la tabla kefir_storage para mantener compatibilidad con el frontend
      return {
        "kefir_inventory_v3": inventoryJson
      };
    } catch (e) {
      console.error("Error synthesizing kefir storage from production inventory:", e);
      return [];
    }
  }),

  setKefirStorage: publicProcedure
    .input(z.object({
      key: z.string(),
      value: z.string()
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false, error: "No DB" };

      const pool = (db as any).session?.client || (global as any)._pool;
      if (!pool) return { success: false, error: "No connection pool" };

      try {
        // 1. Guardar siempre en la tabla de respaldo kefir_storage (Legacy)
        await pool.execute(
          `INSERT INTO kefir_storage (storage_key, storage_value)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE storage_value = VALUES(storage_value), updatedAt = CURRENT_TIMESTAMP`,
          [input.key, input.value]
        );

        // 2. Si la llave es el inventario, sincronizar con la tabla productionInventory (La Verdad)
        if (input.key === "kefir_inventory_v3") {
          const parsed = JSON.parse(input.value);
          const items = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === "object" ? Object.values(parsed) : []);

          for (const item of items) {
            const productId = Number(item.id);
            if (!isNaN(productId) && productId > 0) {
              const [existing] = await db.select().from(productionInventory).where(eq(productionInventory.productId, productId));
              if (existing) {
                await db.update(productionInventory)
                  .set({ quantity: Math.max(0, Number(item.quantity || 0)) })
                  .where(eq(productionInventory.id, existing.id));
              } else {
                await db.insert(productionInventory).values({
                  productId,
                  quantity: Math.max(0, Number(item.quantity || 0)),
                });
              }
            }
          }
        }
        return { success: true };
      } catch (e) {
        console.error("Error setting kefir storage:", e);
        return { success: false, error: String(e) };
      }
    }),

  logKefirData: publicProcedure
    .input(z.object({
      batches: z.any(),
      yields: z.any(),
      inventory: z.any()
    }))
    .mutation(async ({ input }) => {
      return { success: true };
    })
});
