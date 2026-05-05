const { getAllInventory, getAllOrders, getAllProducts, getOrderItems, updateOrder, updateInventoryQuantity, getOrderByNumber } = require('./server/db');

async function verifyAndCorrect() {
  try {
    console.log('--- INICIO VERIFICACION ---');
    
    // 1. Asegurar ORD-011 vigente
    const order = await getOrderByNumber('ORD-011');
    if (order) {
        console.log(`ORD-011 encontrado. Estado actual: ${order.status}`);
        if (order.status === 'cancelled' || order.status === 'delivered') {
            console.log('Cambiando ORD-011 a status: pending');
            await updateOrder(order.id, { status: 'pending' });
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
            const inv = inventory.find(i => i.productId === product.id);
            const currentQty = inv ? inv.quantity : 0;
            console.log(`Producto: ${product.name} (ID: ${product.id}) - Cantidad actual: ${currentQty}, Objetivo: ${target.qty}`);
            
            if (currentQty !== target.qty) {
                console.log(`Ajustando ${product.name} a ${target.qty}...`);
                // En modo demo, updateInventoryQuantity funciona sobre MOCK_INVENTORY
                await updateInventoryQuantity(product.id, target.qty, 'Ajuste solicitado por usuario', 'entry');
            }
        } else {
            console.log(`Producto con nombre '${target.name}' no encontrado.`);
        }
    }

    console.log('--- FIN VERIFICACION ---');
  } catch (err) {
    console.error('Error durante la verificacion:', err);
  }
}

verifyAndCorrect();
