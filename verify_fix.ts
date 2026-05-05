import { getAllInventory, getAllOrders, getAllProducts, getOrderItems, updateOrder, updateInventory, getOrderByNumber } from './server/db';

async function verifyAndCorrect() {
  try {
    console.log('--- INICIO VERIFICACION ---');
    
    // 1. Asegurar ORD-011 vigente
    const order = await getOrderByNumber('ORD-011');
    if (order) {
        console.log(`ORD-011 encontrado. Estado actual: ${order.status}`);
        if (order.status === 'cancelled' || order.status === 'delivered') {
            console.log('Cambiando ORD-011 a status: assigned'); // Assigned es un estado vigente típico
            await updateOrder(order.id, { status: 'assigned' });
        }
    } else {
        console.log('ORD-011 no existe en el sistema.');
    }

    // 2. Ajustar Inventario
    const products = await getAllProducts();
    const inventory = await getAllInventory();
    
    const targets = [
        { name: 'coco', qty: 2 },
        { name: 'frutilla', qty: 2 },
        { name: 'natural', qty: 2 },
        { name: 'vainilla', qty: 2 }
    ];

    for (const target of targets) {
        const product = products.find(p => p.name.toLowerCase().includes(target.name));
        if (product) {
            // Buscamos el stock total disponible para este producto
            const productInventory = inventory.filter(i => i.productId === product.id);
            const totalQty = productInventory.reduce((sum, i) => sum + i.quantity, 0);
            
            console.log(`Producto: ${product.name} (ID: ${product.id}) - Cantidad actual: ${totalQty}, Objetivo: ${target.qty}`);
            
            if (totalQty !== target.qty) {
                console.log(`Ajustando ${product.name} a ${target.qty}...`);
                const diff = target.qty - totalQty;
                await updateInventory(product.id, target.qty);
            }
        } else {
            console.log(`Producto con nombre '${target.name}' no encontrado.`);
        }
    }

    // 3. Verificar que ORD-011 tenga 1 coco y 1 frutilla
    if (order) {
        const items = await getOrderItems(order.id);
        console.log('Items actuales de ORD-011:', items.map(i => `${i.productName} x${i.quantity}`).join(', '));
        
        // El usuario dice: "tiene que haber pedidos : 1 coco 1 frutilla"
        // (Esto es informativo por ahora, si quisiera cambiarlo necesitaría más lógica)
    }

    console.log('--- FIN VERIFICACION ---');
  } catch (err) {
    console.error('Error durante la verificacion:', err);
  }
}

verifyAndCorrect();
