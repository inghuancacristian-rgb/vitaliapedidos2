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
import { eq, desc, and, count } from 'drizzle-orm';
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

    // 1. Obtener stock actual de la tabla de inventario de producción
    const prodItems = await db
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

    // 2. Obtener transferencias completadas hacia producción (para asegurar consistencia)
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

    // 3. Combinar ambos resultados en un mapa para evitar duplicados y sumar cantidades
    const aggregate = new Map<number, any>();

    // Primero agregamos los items de la tabla de inventario (prioridad)
    for (const item of prodItems) {
      aggregate.set(item.productId, { ...item });
    }

    // Luego sumamos las transferencias que podrían no haberse reflejado en la tabla principal
    for (const row of transferRows) {
      const existing = aggregate.get(row.productId);
      if (!existing) {
        const current = {
          id: `transfer-${row.productId}`,
          productId: row.productId,
          quantity: row.quantity,
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
        aggregate.set(row.productId, current);
      }
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

  transferToGeneral: publicProcedure
    .input(z.object({
      items: z.array(z.object({
        productId: z.number(),
        quantity: z.number(),
      })),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const pool = (db as any).session?.client || (global as any)._pool;
      if (!pool) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: "No connection pool" });

      // @ts-ignore
      const userId = ctx.user?.id || 1;

      try {
        // 1. Crear el registro del traspaso
        const transferNumber = `TRN-${Date.now().toString().slice(-6)}`;
        const [transferRes] = await db.insert(inventoryTransfers).values({
          transferNumber,
          direction: 'to_general',
          status: 'completed',
          userId: userId,
          notes: input.notes || 'Traspaso automático desde planta',
        });
        const transferId = transferRes.insertId;

        for (const item of input.items) {
          // 2. Restar de inventario de producción
          const [prodStock] = await db.select().from(productionInventory).where(eq(productionInventory.productId, item.productId));
          if (!prodStock || prodStock.quantity < item.quantity) {
            throw new Error(`Stock insuficiente en planta para el producto ID ${item.productId}`);
          }
          await db.update(productionInventory)
            .set({ quantity: prodStock.quantity - item.quantity })
            .where(eq(productionInventory.id, prodStock.id));

          // 3. Sumar al inventario general
          const [genStock] = await db.select().from(inventory).where(eq(inventory.productId, item.productId));
          if (genStock) {
            await db.update(inventory)
              .set({ quantity: genStock.quantity + item.quantity })
              .where(eq(inventory.id, genStock.id));
          } else {
            await db.insert(inventory).values({
              productId: item.productId,
              quantity: item.quantity,
            });
          }

          // 4. Registrar items del traspaso
          const product = await db.query.products.findFirst({
            where: eq(products.id, item.productId)
          });
          await db.insert(inventoryTransferItems).values({
            transferId,
            productId: item.productId,
            quantity: item.quantity,
            productName: product?.name || 'Desconocido',
            productUnit: product?.unit || 'uds',
          });

          // 5. Registrar movimiento en Kardex de Planta
          if (pool && product) {
            await pool.execute(
              'INSERT INTO kefir_movements (productId, productName, category, previousQuantity, newQuantity, changeAmount, reason) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [
                product.id.toString(),
                product.name,
                product.category,
                prodStock.quantity,
                prodStock.quantity - item.quantity,
                -item.quantity,
                `Traspaso a General #${transferNumber}`
              ]
            ).catch(console.error);
          }
        }

        return { success: true, transferNumber };
      } catch (e: any) {
        console.error("[Transfer] Error:", e);
        throw new TRPCError({ code: 'BAD_REQUEST', message: e.message });
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
      const pool = (db as any).session?.client || (global as any)._pool;

      // 1. Intentar obtener datos de production_inventory (fuente de verdad principal)
      let items: any[] = [];

      if (pool) {
        try {
          const [prodRows] = await pool.execute(`
            SELECT pi.productId as id, p.name, pi.quantity, p.unit, p.category, p.price as costPerUnit,
                   p.presentationQuantity, p.presentationUnit, p.presentationVolumeMl,
                   p.presentationWeightGr, p.productionRole
            FROM production_inventory pi
            INNER JOIN products p ON pi.productId = p.id
          `);

          console.log(`[getKefirStorage] production_inventory: ${prodRows?.length || 0} items`);

          if (Array.isArray(prodRows) && prodRows.length > 0) {
            items = prodRows.map((row: any) => ({
              id: row.id,
              name: row.name,
              quantity: row.quantity,
              unit: row.unit || 'uds',
              minStock: 5,
              category: row.category,
              costPerUnit: row.costPerUnit,
              presentationQuantity: row.presentationQuantity || 1,
              presentationUnit: row.presentationUnit || row.unit || 'unidad',
              presentationVolumeMl: row.presentationVolumeMl || 0,
              presentationWeightGr: row.presentationWeightGr || 0,
              productionRole: row.productionRole || 'none',
            }));
          } else {
            // FALLBACK: Si no hay nada en production_inventory, buscar en inventory_transfer_items
            const [transferRows] = await pool.execute(`
              SELECT it.productId as id, p.name, it.quantity, p.unit, p.category, p.price as costPerUnit,
                     p.presentationQuantity, p.presentationUnit, p.presentationVolumeMl,
                     p.presentationWeightGr, p.productionRole
              FROM inventory_transfer_items it
              INNER JOIN inventory_transfers t ON it.transferId = t.id
              INNER JOIN products p ON it.productId = p.id
              WHERE t.direction = 'to_production' AND t.status = 'completed'
            `);

            if (Array.isArray(transferRows)) {
              console.log(`[getKefirStorage] inventory_transfer_items: ${transferRows.length} items found`);
              const agg = new Map();
              for (const row of transferRows) {
                const current = agg.get(row.id) || {
                  id: row.id, name: row.name, quantity: 0, unit: row.unit || 'uds',
                  minStock: 5, category: row.category, costPerUnit: row.costPerUnit,
                  presentationQuantity: row.presentationQuantity || 1,
                  presentationUnit: row.presentationUnit || row.unit || 'unidad',
                  presentationVolumeMl: row.presentationVolumeMl || 0,
                  presentationWeightGr: row.presentationWeightGr || 0,
                  productionRole: row.productionRole || 'none'
                };
                current.quantity += row.quantity;
                agg.set(row.id, current);
              }
              items = Array.from(agg.values());
              console.log(`[getKefirStorage] Fallback aggregated: ${items.length} items`);
            }
          }
        } catch (e) {
          console.error("Error reading production inventory:", e);
        }
      }

      // 2. Formatear los datos como el JSON que el módulo de Kefir espera (kefir_inventory_v3)
      const inventoryJson = JSON.stringify(items);
      console.log(`[getKefirStorage] Final result: ${items.length} items`);

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

  debugKefirData: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { error: "No DB" };

    const pool = (db as any).session?.client || (global as any)._pool;
    if (!pool) return { error: "No pool" };

    try {
      // production_inventory
      const [prodRows] = await pool.execute('SELECT * FROM production_inventory');

      // inventory_transfer_items
      const [transferRows] = await pool.execute('SELECT * FROM inventory_transfer_items');

      // products
      const [products] = await pool.execute('SELECT id, name, category, productionRole FROM products');

      // inventory_transfers
      const [transfers] = await pool.execute('SELECT * FROM inventory_transfers ORDER BY id DESC LIMIT 5');

      return {
        production_inventory: prodRows,
        inventory_transfer_items: transferRows,
        products: products,
        inventory_transfers: transfers
      };
    } catch (e) {
      return { error: String(e) };
    }
  }),

  validateParity: publicProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) return { success: false, error: "No DB" };

    try {
      const allProducts = await db.select().from(products);
      const milkProduct = allProducts.find(p => p.name.toLowerCase().includes('leche') && p.productionRole === 'finished_good')
                        || allProducts.find(p => p.productionRole === 'finished_good');
      const inputProduct = allProducts.find(p => p.productionRole === 'milk' || p.name.toLowerCase().includes('insumo'))
                         || allProducts.find(p => p.productionRole === 'none');

      if (!milkProduct || !inputProduct) return { success: false, error: "No se encontraron productos de prueba" };

      const batchNumber = `PARITY-TEST-${Date.now()}`;
      const [batchResult] = await db.insert(productionBatches).values({
        batchNumber,
        type: 'kefir_production',
        status: 'in_progress',
        registeredBy: 1,
        notes: 'Validacion de paridad',
      });
      const batchId = batchResult.insertId;

      const outputQty = 10;
      const inputQty = 5;

      await db.update(productionBatches).set({ status: 'completed', endDate: new Date() }).where(eq(productionBatches.id, batchId));
      await db.insert(productionOutputs).values({ batchId, productId: milkProduct.id, quantity: outputQty });

      const [prodStock] = await db.select().from(productionInventory).where(eq(productionInventory.productId, milkProduct.id));
      const startProdQty = prodStock?.quantity || 0;
      if (prodStock) {
        await db.update(productionInventory).set({ quantity: startProdQty + outputQty }).where(eq(productionInventory.id, prodStock.id));
      } else {
        await db.insert(productionInventory).values({ productId: milkProduct.id, quantity: outputQty });
      }

      await db.insert(productionInputs).values({ batchId, productId: inputProduct.id, quantity: inputQty });
      const [genStock] = await db.select().from(inventory).where(eq(inventory.productId, inputProduct.id));
      if (genStock) {
        await db.update(inventory).set({ quantity: Math.max(0, genStock.quantity - inputQty) }).where(eq(inventory.id, genStock.id));
      }

      await db.insert(inventoryMovements).values({
        productId: inputProduct.id,
        type: 'exit',
        quantity: inputQty,
        reason: `Validacion paridad #${batchNumber}`,
        userId: 1,
      });

      const [finalProd] = await db.select().from(productionInventory).where(eq(productionInventory.productId, milkProduct.id));
      const [finalGen] = await db.select().from(inventory).where(eq(inventory.productId, inputProduct.id));

      const success = finalProd.quantity === (startProdQty + outputQty) && finalGen.quantity === Math.max(0, (genStock?.quantity || 0) - inputQty);

      return {
        success,
        details: {
          batch: batchNumber,
          productionStock: { initial: startProdQty, final: finalProd.quantity, expected: startProdQty + outputQty },
          generalStock: { initial: genStock?.quantity || 0, final: finalGen.quantity, expected: Math.max(0, (genStock?.quantity || 0) - inputQty) }
        }
      };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  })

});
