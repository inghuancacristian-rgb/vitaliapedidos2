import { createProduct, createOrder, updateInventory, updateOrder, createCustomer, getAllProducts, getOrderByNumber } from './server/db';
import { orders, orderItems } from './drizzle/schema';
import { getDb } from './server/db';

async function seedUserRequest() {
  try {
    console.log('--- SEEDING USER REQUEST ---');
    
    // 1. Crear productos si no existen
    const productNames = ['Coco', 'Frutilla', 'Natural', 'Vainilla'];
    const productIds: Record<string, number> = {};
    
    const existingProducts = await getAllProducts();
    
    for (const name of productNames) {
        let p = existingProducts.find(ep => ep.name === name);
        if (!p) {
            console.log(`Creando producto: ${name}`);
            const res = await createProduct({
                name,
                code: name.substring(0, 3).toUpperCase(),
                price: 10,
                salePrice: 15,
                category: 'Helados'
            });
            // En modo demo, result.insertId es el nuevo ID
            productIds[name] = (res as any).insertId;
        } else {
            productIds[name] = p.id;
        }
    }

    // 2. Asegurar Inventario Disponible: 2 para cada uno
    // Nota: El sistema descuenta del stock físico al crear el pedido.
    // Si queremos que "Disponibles" sea 2, y ya hay 1 reservado (o lo habrá),
    // debemos setear el stock físico a 2.
    for (const name of productNames) {
        console.log(`Seteando inventario para ${name} a 2 unidades disponibles.`);
        await updateInventory(productIds[name], 2);
    }

    // 3. Crear Pedido ORD-011 si no existe
    let order = await getOrderByNumber('ORD-011');
    if (!order) {
        console.log('Creando pedido ORD-011...');
        
        let customerId = 1;
        
        const db = await getDb();
        if (!db) {
            const { MOCK_CUSTOMERS, MOCK_ORDERS, MOCK_ORDER_ITEMS, MOCK_MOVEMENTS } = await import('./server/db');
            
            // Asegurar cliente 1
            if (!MOCK_CUSTOMERS.find(c => c.id === 1)) {
                MOCK_CUSTOMERS.push({
                    id: 1,
                    clientNumber: 'C-001',
                    name: 'Cliente Prueba',
                    phone: '12345678',
                    createdAt: new Date()
                });
            }

            const newOrderId = MOCK_ORDERS.length + 1;
            const orderData: any = {
                id: newOrderId,
                orderNumber: 'ORD-011',
                customerId: 1,
                customerName: 'Cliente Prueba',
                totalPrice: 30,
                status: 'pending',
                paymentStatus: 'pending',
                createdAt: new Date(),
                updatedAt: new Date(),
                deliveryDate: new Date()
            };
            MOCK_ORDERS.push(orderData);

            // Agregar items: 1 Coco, 1 Frutilla
            MOCK_ORDER_ITEMS.push({
                id: MOCK_ORDER_ITEMS.length + 1,
                orderId: newOrderId,
                productId: productIds['Coco'],
                productName: 'Coco',
                quantity: 1,
                price: 15,
                subtotal: 15
            });
            MOCK_ORDER_ITEMS.push({
                id: MOCK_ORDER_ITEMS.length + 1,
                orderId: newOrderId,
                productId: productIds['Frutilla'],
                productName: 'Frutilla',
                quantity: 1,
                price: 15,
                subtotal: 15
            });

            // Registrar movimientos de reserva
            MOCK_MOVEMENTS.push({
                id: MOCK_MOVEMENTS.length + 1,
                productId: productIds['Coco'],
                type: 'exit',
                quantity: 1,
                reason: 'Pedido reservado ORD-011',
                orderId: newOrderId,
                createdAt: new Date()
            });
            MOCK_MOVEMENTS.push({
                id: MOCK_MOVEMENTS.length + 1,
                productId: productIds['Frutilla'],
                type: 'exit',
                quantity: 1,
                reason: 'Pedido reservado ORD-011',
                orderId: newOrderId,
                createdAt: new Date()
            });
        }
    } else {
        console.log('ORD-011 ya existe. Asegurando que sea vigente (status: pending).');
        await updateOrder(order.id, { status: 'pending' });
    }

    console.log('--- SEED COMPLETADO ---');
  } catch (err) {
    console.error('Error durante el seed:', err);
  }
}

seedUserRequest();
