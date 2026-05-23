import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { inventory } from "../../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";
import {
  getAllProducts,
  createProduct,
  getAllInventory,
  getInventoryByProductId,
  getProductsWithStock,
  updateInventory,
  updateProductPrice,
  updateProduct,
  createInventoryMovement,
  getInventoryMovements,
  getProductById,
  getPurchasesByProductId,
  recordInventoryEntryAsPurchase,
  getOnOrderQuantities,
  getSmartInventoryAlerts,
} from "../db";
import { TRPCError } from "@trpc/server";

function formatCurrencyCents(amount?: number | null) {
  if (amount == null) return "Bs. 0.00";
  return `Bs. ${(amount / 100).toFixed(2)}`;
}

function formatStatusLabel(status?: "active" | "inactive") {
  return status === "inactive" ? "inactivo" : "activo";
}

function classifyHistoryEvent(movement: any) {
  const reason = (movement.reason || "").toLowerCase();
  const notes = movement.notes || movement.reason || "";

  if (reason.includes("producto creado")) {
    return {
      eventType: "created",
      title: "Producto creado",
      description: notes || "Se registró el producto en el inventario.",
    };
  }

  if (reason.includes("dado de baja")) {
    return {
      eventType: "deactivated",
      title: "Producto dado de baja",
      description: notes || "El producto fue marcado como inactivo.",
    };
  }

  if (reason.includes("reactivado")) {
    return {
      eventType: "reactivated",
      title: "Producto reactivado",
      description: notes || "El producto volvió a estar disponible.",
    };
  }

  if (reason.includes("precio") || reason.includes("datos del producto")) {
    return {
      eventType: "updated",
      title: "Datos actualizados",
      description: notes || "Se modificaron datos del producto.",
    };
  }

  if (reason.includes("pedido reservado")) {
    return {
      eventType: "order_reservation",
      title: "Pedido reservado",
      description: notes || `Stock reservado para ${movement.orderNumber || "pedido"} (${movement.quantity} uds.).`,
    };
  }

  if (reason.includes("pedido cancelado")) {
    return {
      eventType: "order_cancellation",
      title: "Pedido cancelado",
      description: notes || `Stock devuelto por ${movement.orderNumber || "pedido"} (${movement.quantity} uds.).`,
    };
  }

  if (reason.includes("pedido")) {
    return {
      eventType: "order_delivery",
      title: "Pedido entregado",
      description: notes || `Entrega de ${movement.orderNumber || "pedido"} confirmada (${movement.quantity} uds.).`,
    };
  }

  if (reason.includes("venta")) {
    return {
      eventType: "sale",
      title: "Venta registrada",
      description: notes || movement.reason || "Se descontó stock por una venta.",
    };
  }

  if (reason.includes("anulaci")) {
    return {
      eventType: "sale_cancellation",
      title: "Venta anulada y stock repuesto",
      description: notes || movement.reason || "Se devolvió stock por anulación.",
    };
  }

  if (notes.includes("auto-registrado") || reason.includes("compra rapida")) {
    return {
      eventType: "purchase",
      title: "Compra registrada (Rápida)",
      description: notes || "Se registró una compra rápida desde el ajuste de inventario.",
    };
  }

  if (movement.type === "entry") {
    if (reason.includes("producci")) {
      return {
        eventType: "production",
        title: "Ingreso por Producción",
        description: notes || "Se registró entrada de producto terminado por producción.",
      };
    }
    return {
      eventType: "inventory_entry",
      title: "Entrada de inventario",
      description: notes || "Se aumentó el stock del producto.",
    };
  }

  if (movement.type === "exit") {
    return {
      eventType: "inventory_exit",
      title: "Salida de inventario",
      description: notes || "Se redujo el stock del producto.",
    };
  }

  return {
    eventType: "inventory_adjustment",
    title: "Ajuste de inventario",
    description: notes || "Se realizó un ajuste manual del producto.",
  };
}

export const inventoryRouter = router({
  // Obtener todos los productos
  listProducts: protectedProcedure.query(async ({ ctx }) => {
    return await getAllProducts();
  }),

  getProductsWithStock: protectedProcedure.query(async () => {
    return await getProductsWithStock();
  }),

  // Crear un nuevo producto
  createProduct: protectedProcedure
    .input(
      z.object({
        code: z.string().min(1, "El código no puede estar vacío"),
        name: z.string(),
        category: z.enum(["finished_product", "raw_material", "supplies", "insumo"]),
        price: z.number(),
        salePrice: z.number().optional(),
        wholesalePrice: z.number().optional(),
        discountPrice: z.number().optional(),
        imageUrl: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
        unit: z.string().optional(),
        presentationQuantity: z.number().optional(),
        presentationUnit: z.string().optional(),
        presentationVolumeMl: z.number().optional(),
        presentationWeightGr: z.number().optional(),
        productionRole: z.enum(["none", "milk", "sugar", "culture", "bottle", "cap", "label", "packaging", "finished_good", "other"]).optional(),
        storageLocation: z.string().optional(),
        supplierName: z.string().optional(),
        productionNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const result = await createProduct({
        code: input.code,
        name: input.name,
        category: input.category,
        price: Math.round(input.price * 100), // Convertir a centavos
        salePrice: Math.round((input.salePrice || 0) * 100),
        wholesalePrice: Math.round((input.wholesalePrice || 0) * 100),
        discountPrice: Math.round((input.discountPrice || 0) * 100),
        imageUrl: input.imageUrl,
        status: (input.status || "active") as "active" | "inactive",
        unit: input.unit || "unidad",
        presentationQuantity: input.presentationQuantity || 1,
        presentationUnit: input.presentationUnit || input.unit || "unidad",
        presentationVolumeMl: input.presentationVolumeMl || 0,
        presentationWeightGr: input.presentationWeightGr || 0,
        productionRole: input.productionRole || "none",
        storageLocation: input.storageLocation || null,
        supplierName: input.supplierName || null,
        productionNotes: input.productionNotes || null,
      });

      let productId = 0;
      if (Array.isArray(result) && result.length > 0) {
        productId = Number(result[0].insertId);
      } else {
        productId = Number((result as any)?.insertId);
      }
      
      if (Number.isFinite(productId) && productId > 0) {
        await createInventoryMovement({
          productId,
          userId: ctx.user.id,
          type: "adjustment",
          quantity: 0,
          reason: "Producto creado",
          notes: `Creado por ${ctx.user.name || ctx.user.username || "usuario"} con precio compra ${formatCurrencyCents(Math.round(input.price * 100))}, venta unitaria ${formatCurrencyCents(Math.round((input.salePrice || 0) * 100))}, mayorista ${formatCurrencyCents(Math.round((input.wholesalePrice || 0) * 100))} y descuento ${formatCurrencyCents(Math.round((input.discountPrice || 0) * 100))}. Estado inicial: ${formatStatusLabel(input.status || "active")}.`,
        });
      }

      return { success: true };
    }),

  // Actualizar un producto
  updateProduct: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        code: z.string().optional(),
        name: z.string().optional(),
        category: z.enum(["finished_product", "raw_material", "supplies", "insumo"]).optional(),
        price: z.number().optional(),
        salePrice: z.number().optional(),
        wholesalePrice: z.number().optional(),
        discountPrice: z.number().optional(),
        imageUrl: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
        unit: z.string().optional(),
        presentationQuantity: z.number().optional(),
        presentationUnit: z.string().optional(),
        presentationVolumeMl: z.number().optional(),
        presentationWeightGr: z.number().optional(),
        productionRole: z.enum(["none", "milk", "sugar", "culture", "bottle", "cap", "label", "packaging", "finished_good", "other"]).optional(),
        storageLocation: z.string().optional().nullable(),
        supplierName: z.string().optional().nullable(),
        productionNotes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const existingProduct = await getProductById(input.id);
      if (!existingProduct) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Producto no encontrado" });
      }

      const { id, ...updateData } = input;
      if (updateData.price !== undefined) {
        updateData.price = Math.round(updateData.price * 100);
      }
      if (updateData.salePrice !== undefined) {
        updateData.salePrice = Math.round(updateData.salePrice * 100);
      }
      if (updateData.wholesalePrice !== undefined) {
        updateData.wholesalePrice = Math.round(updateData.wholesalePrice * 100);
      }
      if (updateData.discountPrice !== undefined) {
        updateData.discountPrice = Math.round(updateData.discountPrice * 100);
      }

      await updateProduct(id, updateData as any);

      const actorName = ctx.user.name || ctx.user.username || "usuario";
      const historyEvents: Array<{ reason: string; notes: string }> = [];

      if (updateData.status && updateData.status !== existingProduct.status) {
        historyEvents.push({
          reason: updateData.status === "inactive" ? "Producto dado de baja" : "Producto reactivado",
          notes: `${actorName} cambió el estado de ${formatStatusLabel(existingProduct.status)} a ${formatStatusLabel(updateData.status)}.`,
        });
      }

      if (
        updateData.price !== undefined && updateData.price !== existingProduct.price ||
        updateData.salePrice !== undefined && updateData.salePrice !== existingProduct.salePrice ||
        updateData.wholesalePrice !== undefined && updateData.wholesalePrice !== existingProduct.wholesalePrice ||
        updateData.discountPrice !== undefined && updateData.discountPrice !== existingProduct.discountPrice
      ) {
        const buyChange = updateData.price !== undefined ? `${formatCurrencyCents(existingProduct.price)} -> ${formatCurrencyCents(updateData.price)}` : "sin cambios";
        const saleChange = updateData.salePrice !== undefined ? `${formatCurrencyCents(existingProduct.salePrice)} -> ${formatCurrencyCents(updateData.salePrice)}` : "sin cambios";
        const wholesaleChange = updateData.wholesalePrice !== undefined ? `${formatCurrencyCents(existingProduct.wholesalePrice)} -> ${formatCurrencyCents(updateData.wholesalePrice)}` : "sin cambios";
        const discountChange = updateData.discountPrice !== undefined ? `${formatCurrencyCents(existingProduct.discountPrice)} -> ${formatCurrencyCents(updateData.discountPrice)}` : "sin cambios";

        historyEvents.push({
          reason: "Precios actualizados",
          notes: `${actorName} actualizó precios. Compra: ${buyChange}. Venta: ${saleChange}. Mayorista: ${wholesaleChange}. Descuento: ${discountChange}.`,
        });
      }

      const changedFields: string[] = [];
      if (updateData.name !== undefined && updateData.name !== existingProduct.name) {
        changedFields.push(`nombre: ${existingProduct.name} -> ${updateData.name}`);
      }
      if (updateData.code !== undefined && updateData.code !== existingProduct.code) {
        changedFields.push(`código: ${existingProduct.code} -> ${updateData.code}`);
      }
      if (updateData.category !== undefined && updateData.category !== existingProduct.category) {
        changedFields.push(`categoría: ${existingProduct.category} -> ${updateData.category}`);
      }
      if (updateData.imageUrl !== undefined && updateData.imageUrl !== existingProduct.imageUrl) {
        changedFields.push("imagen actualizada");
      }

      if (changedFields.length > 0) {
        historyEvents.push({
          reason: "Datos del producto actualizados",
          notes: `${actorName} modificó ${changedFields.join(", ")}.`,
        });
      }

      for (const event of historyEvents) {
        await createInventoryMovement({
          productId: id,
          userId: ctx.user.id,
          type: "adjustment",
          quantity: 0,
          reason: event.reason,
          notes: event.notes,
        });
      }

      return { success: true };
    }),

  // Obtener inventario completo
  listInventory: protectedProcedure.query(async ({ ctx }) => {
    const [inventory, products, onOrder] = await Promise.all([
      getAllInventory(),
      getAllProducts(),
      getOnOrderQuantities()
    ]);

    return inventory.map((inv: any) => {
      const product = products.find((p: any) => p.id === inv.productId);
      return {
        ...inv,
        product,
        onOrder: onOrder[inv.productId] || 0,
        isLowStock: inv.quantity <= inv.minStock,
      };
    });
  }),

  // Actualizar cantidad de producto y precio
  updateQuantity: protectedProcedure
    .input(
      z.object({
        productId: z.number(),
        quantity: z.number(),
        price: z.number().optional(), // nuevo precio en centavos
        reason: z.string().optional(),
        type: z.enum(["entry", "exit", "adjustment"]).optional(),
        expiryDate: z.string().optional(),
        batchNumber: z.string().optional(),
        registerPurchase: z.boolean().optional(),
        paymentMethod: z.enum(["cash", "qr", "transfer"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const product = await getProductById(input.productId);
      
      // Obtener el inventario específico para este lote/producto
      const db = await import("../db").then(m => m.getDb());
      let existingInv = null;
      if (db) {
        const res = await db.select().from(inventory).where(and(
          eq(inventory.productId, input.productId),
          input.batchNumber ? eq(inventory.batchNumber, input.batchNumber) : isNull(inventory.batchNumber)
        )).limit(1);
        existingInv = res.length > 0 ? res[0] : null;
      } else {
        const { MOCK_INVENTORY } = await import("../db");
        existingInv = MOCK_INVENTORY.find(i => i.productId === input.productId && (input.batchNumber ? i.batchNumber === input.batchNumber : !i.batchNumber)) || null;
      }

      const newQuantity = (existingInv?.quantity || 0) + input.quantity;
      
      const { updateInventory, createInventoryMovement, updateProductPrice, recordInventoryEntryAsPurchase } = await import("../db");
      await updateInventory(input.productId, newQuantity, input.expiryDate, input.batchNumber);

      const notes: string[] = [];
      if (input.price !== undefined && product && input.price !== product.price) {
        notes.push(
          `Precio compra: ${formatCurrencyCents(product.price)} -> ${formatCurrencyCents(input.price)}`
        );
      }
      if (input.expiryDate !== undefined && input.expiryDate !== (existingInv?.expiryDate || undefined)) {
        notes.push(
          `Vencimiento: ${existingInv?.expiryDate || "sin fecha"} -> ${input.expiryDate || "sin fecha"}`
        );
      }

      if (input.quantity !== 0 || notes.length > 0) {
        await createInventoryMovement({
          productId: input.productId,
          userId: ctx.user.id,
          type: input.type || (input.quantity === 0 ? "adjustment" : input.quantity > 0 ? "entry" : "exit"),
          quantity: Math.abs(input.quantity),
          batchNumber: input.batchNumber,
          reason: input.reason || "Ajuste manual",
          notes: notes.length > 0 ? notes.join(". ") : undefined,
        });
      }

      // Actualizar precio si es necesario (solo si se envio)
      if (input.price !== undefined) {
        await updateProductPrice(input.productId, input.price);
      }

      // Compra rapida: registrar como compra (finanzas + historial)
      if (input.registerPurchase && input.quantity > 0) {
        const effectivePrice = input.price ?? product?.price;
        if (!effectivePrice || effectivePrice <= 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Para compra rapida debes indicar el precio de compra." });
        }

        await recordInventoryEntryAsPurchase(
          input.productId,
          input.quantity,
          effectivePrice,
          input.expiryDate,
          input.batchNumber,
          input.reason,
          input.paymentMethod,
          ctx.user.id
        );
      }

      return { success: true };
    }),

  // Obtener productos con stock bajo
  getLowStockProducts: protectedProcedure.query(async ({ ctx }) => {
    const inventory = await getAllInventory();
    const products = await getAllProducts();

    return inventory
      .filter((inv: any) => inv.quantity <= inv.minStock)
      .map((inv: any) => {
        const product = products.find((p: any) => p.id === inv.productId);
        return {
          ...inv,
          product,
        };
      });
  }),

  // Obtener alertas de vencimiento
  getExpiryAlerts: protectedProcedure.query(async ({ ctx }) => {
    const inventory = await getAllInventory();
    const products = await getAllProducts();
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const alerts = inventory
      .filter((inv: any) => inv.expiryDate !== null)
      .map((inv: any) => {
        const product = products.find((p: any) => p.id === inv.productId);
        const expiryDate = new Date(inv.expiryDate!);
        
        let status: 'expired' | 'critical' | 'warning' = 'warning';
        if (expiryDate < now) status = 'expired';
        else if (expiryDate <= sevenDaysFromNow) status = 'critical';
        else if (expiryDate <= thirtyDaysFromNow) status = 'warning';
        else return null;

        return {
          ...inv,
          product,
          expiryStatus: status,
          daysRemaining: Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        };
      })
      .filter((item: any): item is NonNullable<typeof item> => item !== null)
      .sort((a: any, b: any) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime());

    return alerts;
  }),

  // Obtener inventario por producto
  getByProductId: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await getInventoryByProductId(input.productId);
    }),

  getProductHistory: protectedProcedure
    .input(z.object({ 
      productId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const [product, stock, movements, purchases] = await Promise.all([
        getProductById(input.productId),
        getInventoryByProductId(input.productId),
        getInventoryMovements(input.productId),
        getPurchasesByProductId(input.productId),
      ]);

      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Producto no encontrado" });
      }

      // Calcular stock físico total (suma de todos los lotes)
      const currentStock = Array.isArray(stock)
        ? stock.reduce((sum: number, batch: any) => sum + (batch.quantity || 0), 0)
        : (stock?.quantity ?? 0);

      const hasCreationMovement = movements.some((movement: any) =>
        (movement.reason || "").toLowerCase().includes("producto creado")
      );

      // NOTA IMPORTANTE: createPurchase() actualiza inventory.quantity DIRECTAMENTE
      // sin crear un inventoryMovement. Por eso necesitamos DOS fuentes:
      // 1. inventoryMovements → para ajustes manuales, ventas, pedidos, produccion
      // 2. purchases (received) → para compras del modulo Compras (no tienen movement)
      //
      // Para evitar doble conteo, excluimos del purchaseTimeline las compras
      // que SI tienen un movimiento (marcadas como "auto-registrado").

      let timeline: any[] = movements.map((movement: any) => {
        const classification = classifyHistoryEvent(movement);
        return {
          id: `movement-${movement.id}`,
          source: "movement",
          createdAt: movement.createdAt,
          quantity: movement.quantity,
          movementType: movement.type,
          userName: movement.userName,
          userRole: movement.userRole,
          orderNumber: movement.orderNumber,
          saleNumber: movement.saleNumber,
          orderStatus: movement.orderStatus,
          deliveryPersonName: movement.deliveryPersonName,
          ...classification,
        };
      });

      // Compras del modulo Compras: solo "received" y no "auto-registrado"
      // (auto-registrado = compra rapida que SI crea un inventoryMovement)
      // Definir tipos de impacto para el cálculo
      const ENTRY_TYPES = new Set([
        "purchase",          // Compra de proveedor
        "inventory_entry",   // Entrada manual de inventario
        "production",        // Ingreso por produccion
        "sale_cancellation", // Anulacion de venta (devuelve stock)
        "order_cancellation",// Pedido cancelado (devuelve stock)
      ]);

      const EXIT_TYPES = new Set([
        "sale",              // Venta registrada
        "order_reservation", // Pedido reservado (descuenta fisicamente)
        "inventory_exit",    // Salida manual de inventario
      ]);

      const purchaseTimeline = (purchases || [])
        .filter((purchase: any) => {
          const isReceived = purchase.purchaseStatus === "received" || purchase.status === "received";
          const isAutoRegistered = (purchase.notes || "").toLowerCase().includes("auto-registrado");
          return isReceived && !isAutoRegistered;
        })
        .map((purchase: any) => ({
          id: `purchase-item-${purchase.id}`,
          source: "purchase",
          createdAt: purchase.createdAt || purchase.purchaseCreatedAt || purchase.orderDate,
          quantity: purchase.quantity,
          movementType: "entry",
          eventType: "purchase",
          title: "Compra de proveedor",
          description: `Compra ${purchase.purchaseNumber || ""} de ${purchase.supplierName || "proveedor"} - ${formatCurrencyCents(purchase.price)} x unidad.${purchase.expiryDate ? ` Venc: ${purchase.expiryDate}.` : ""}`,
        }));

      if (!hasCreationMovement) {
        timeline.push({
          id: `product-created-${product.id}`,
          source: "product",
          createdAt: product.createdAt,
          quantity: 0,
          movementType: "adjustment",
          eventType: "created",
          title: "Producto creado",
          description: `Se registro el producto ${product.name} con codigo ${product.code}.`,
        });
      }

      timeline.push(...purchaseTimeline);

      // --- RECONCILIACIÓN DE SALDO INICIAL ---
      // Calculamos cuánto suman los movimientos actuales para ver si falta algo 
      // para llegar al Stock Físico Actual.
      let currentMovementsSum = 0;
      timeline.forEach((event: any) => {
        // Ignoramos eventos puramente informativos
        const isNeutral = event.eventType === "order_delivery" || 
                          event.eventType === "updated" || 
                          event.eventType === "created";
        
        if (!isNeutral && event.quantity > 0) {
          if (event.movementType === "entry" || ENTRY_TYPES.has(event.eventType)) {
            currentMovementsSum += event.quantity;
          } else if (event.movementType === "exit" || EXIT_TYPES.has(event.eventType)) {
            currentMovementsSum -= event.quantity;
          }
        }
      });

      const discrepancy = currentStock - currentMovementsSum;
      if (discrepancy !== 0) {
        // Asignar la discrepancia al evento inicial de creación/apertura
        const initialEvent = timeline.find(e => e.eventType === "created");
        if (initialEvent) {
          initialEvent.quantity = Math.abs(discrepancy);
          initialEvent.movementType = discrepancy > 0 ? "entry" : "exit";
          initialEvent.title = "Saldo Inicial / Apertura";
          initialEvent.description = "Ajuste automático para sincronizar el historial con el stock físico actual.";
          // Ya no es neutral si tiene cantidad
          (initialEvent as any).isAdjustmentRecord = true; 
        }
      }
      // ---------------------------------------

      // Calcular Kardex (Saldo acumulado)
      // Ordenar ascendente para el cálculo
      timeline.sort(
        (a: any, b: any) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      let runningBalance = 0;
      let runningOnOrder = 0;
      const timelineWithKardex = timeline.map((event: any) => {
        let entry = 0;
        let exit = 0;
        let reserved = 0;   // unidades que entran a pedido
        let released = 0;   // unidades que salen de pedido (entregadas o canceladas)

        if (event.quantity && event.quantity > 0) {
          // Evitar doble descuento: la reserva ya resto stock. 
          // La entrega es un evento informativo/financiero para el Kardex.
          const isNeutral = (event.eventType === "order_delivery" || 
                            event.eventType === "updated" || 
                            event.eventType === "created") && !(event as any).isAdjustmentRecord;

          if (!isNeutral) {
            if (event.movementType === "entry" || ENTRY_TYPES.has(event.eventType)) {
              entry = event.quantity;
            } else if (event.movementType === "exit" || EXIT_TYPES.has(event.eventType)) {
              exit = event.quantity;
            } else if (event.movementType === "adjustment") {
              if (ENTRY_TYPES.has(event.eventType)) entry = event.quantity;
              else if (EXIT_TYPES.has(event.eventType)) exit = event.quantity;
            }
          }

          // Balance de pedidos activos (running)
          if (event.eventType === "order_reservation") {
            reserved = event.quantity;
          } else if (
            event.eventType === "order_delivery" ||
            event.eventType === "order_cancellation"
          ) {
            released = event.quantity;
          }
        }

        runningBalance += (entry - exit);
        runningOnOrder = Math.max(0, runningOnOrder + reserved - released);

        return {
          ...event,
          entry,
          exit,
          balance: runningBalance,
          onOrder: runningOnOrder,
        };
      });

      // Ordenar descendente para la UI
      let finalTimeline = timelineWithKardex.sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Aplicar filtros de fecha si existen
      if (input.startDate) {
        const start = new Date(input.startDate);
        finalTimeline = finalTimeline.filter(e => new Date(e.createdAt) >= start);
      }
      if (input.endDate) {
        const end = new Date(input.endDate + " 23:59:59");
        finalTimeline = finalTimeline.filter(e => new Date(e.createdAt) <= end);
      }

      // Usar los valores ya calculados del Kardex (entry/exit semantico)
      // Totales de TODAS las entradas (compras + produccion + devoluciones)
      const totalPurchasedUnits = finalTimeline
        .reduce((sum: number, event: any) => sum + (event.entry || 0), 0);

      // Totales de TODAS las salidas (ventas + pedidos + salidas manuales)
      const totalSoldUnits = finalTimeline
        .reduce((sum: number, event: any) => sum + (event.exit || 0), 0);

      // Saldo calculado por Kardex (ultimo registro de la timeline ordenada desc = el mas reciente)
      const kardexFinalBalance = finalTimeline.length > 0 ? finalTimeline[0].balance : runningBalance;

      return {
        product,
        stock,
        summary: {
          totalEvents: finalTimeline.length,
          totalSoldUnits,
          totalPurchasedUnits,
          currentStatus: product.status,
          // saldo mas antiguo de la timeline antes de sus propios movimientos
          initialBalance: finalTimeline.length > 0
            ? finalTimeline[finalTimeline.length - 1].balance - (finalTimeline[finalTimeline.length - 1].entry - finalTimeline[finalTimeline.length - 1].exit)
            : 0,
          finalBalance: kardexFinalBalance,
        },
        timeline: finalTimeline,
      };
    }),

  getSmartAlerts: protectedProcedure.query(async () => {
    return await getSmartInventoryAlerts();
  }),
});
