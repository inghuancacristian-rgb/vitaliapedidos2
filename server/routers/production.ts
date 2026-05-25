import { z } from 'zod';
import { router, publicProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { productionBatches, productionOutputs, inventory, inventoryMovements, users, products } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
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
      }))
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      // @ts-ignore
      const userId = ctx.user?.id || 1;

      // Update batch status
      await db.update(productionBatches)
        .set({ status: 'completed', endDate: new Date() })
        .where(eq(productionBatches.id, input.batchId));

      // Record outputs and update inventory
      for (const output of input.outputs) {
        // Record output
        await db.insert(productionOutputs).values({
          batchId: input.batchId,
          productId: output.productId,
          quantity: output.quantity,
        });

        // Add to inventory
        const [existingStock] = await db.select().from(inventory).where(eq(inventory.productId, output.productId));
        if (existingStock) {
          await db.update(inventory)
            .set({ quantity: existingStock.quantity + output.quantity })
            .where(eq(inventory.id, existingStock.id));
        } else {
          await db.insert(inventory).values({
            productId: output.productId,
            quantity: output.quantity,
          });
        }

        // Record inventory movement
        await db.insert(inventoryMovements).values({
          productId: output.productId,
          type: 'entry',
          quantity: output.quantity,
          reason: `Producción de lote #${input.batchId}`,
          userId: userId,
        });
      }

      return { success: true };
    }),

  getBatchOutputs: publicProcedure
    .input(z.object({ batchId: z.number() }))
    .query(async ({ input }) => {
      console.log(`[Production] Fetching outputs for batch ${input.batchId}...`);
      const db = await getDb();
      if (!db) return [];
      
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
        
      console.log(`[Production] Found ${outputs.length} outputs for batch ${input.batchId}`);
      return outputs;
    }),
    
  logKefirData: publicProcedure
    .input(z.object({
      batches: z.any(),
      yields: z.any(),
      inventory: z.any()
    }))
    .mutation(async ({ input }) => {
      console.log("\n\n=== KEFIR CONTROL DATA DUMP ===");
      console.log("BATCHES:", JSON.stringify(input.batches, null, 2));
      console.log("YIELDS:", JSON.stringify(input.yields, null, 2));
      console.log("INVENTORY:", JSON.stringify(input.inventory, null, 2));
      console.log("===============================\n\n");
      return { success: true };
    })
});
