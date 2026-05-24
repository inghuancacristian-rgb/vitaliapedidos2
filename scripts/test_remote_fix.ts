
async function testApp() {
  const loginRes = await fetch("https://vitaliapedidos2-production-a969.up.railway.app/api/trpc/auth.loginTraditional", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      json: {
        username: "admin",
        password: "admin123"
      }
    })
  });
  
  const loginText = await loginRes.text();
  console.log("Login response:", loginText);
  
  const cookie = loginRes.headers.get("set-cookie");
  console.log("Cookie:", cookie);

  // Now try to fetch products
  const productsRes = await fetch("https://vitaliapedidos2-production-a969.up.railway.app/api/trpc/inventory.listProducts", {
    headers: {
      "Cookie": cookie || ""
    }
  });
  
  const productsText = await productsRes.text();
  console.log("Products response:", productsText.substring(0, 500));

  // Try to create a product
  const createRes = await fetch("https://vitaliapedidos2-production-a969.up.railway.app/api/trpc/inventory.createProduct", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": cookie || ""
    },
    body: JSON.stringify({
      json: {
        code: "TEST1234",
        name: "Test Product",
        category: "finished_product",
        price: 100,
        salePrice: 200,
        wholesalePrice: 150,
        discountPrice: 180,
        wholesaleDiscountType: "percentage",
        wholesaleDiscountValue: 10,
        unit: "unidad",
        presentationQuantity: 1,
        presentationUnit: "unidad",
        presentationVolumeMl: 0,
        presentationWeightGr: 0,
        productionRole: "none",
        status: "active"
      }
    })
  });
  const createText = await createRes.text();
  console.log("Create product response:", createText);
}

testApp().catch(console.error);
