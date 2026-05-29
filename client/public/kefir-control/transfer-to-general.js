(function () {
  var STORAGE_KEY = "kefir_inventory_v3";
  var TRANSFER_ENDPOINT = "/api/trpc/inventory.transferToGeneral?batch=1";
  var PRODUCTS_ENDPOINT = "/api/trpc/inventory.listProducts?batch=1";
  var CREATE_PRODUCT_ENDPOINT = "/api/trpc/inventory.createProduct?batch=1";
  var SYNC_PRODUCTS_ENDPOINT = "/api/trpc/inventory.syncKefirProducts?batch=1";
  var pendingReload = false;
  var currentReceipt = null;
  var generalProductsPromise = null;
  var modalRows = [];
  var productCatalogSyncRunning = false;
  var productCatalogWriteInProgress = false;
  var productCatalogSyncTimer = null;

  function toNumber(value, fallback) {
    var numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : fallback;
  }

  function normalize(value) {
    return String(value == null ? "" : value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/(\d+(?:[.,]\d+)?)\s*(litros|litro|lts|lt|l)\b/g, "$1l")
      .replace(/(\d+(?:[.,]\d+)?)\s*(mililitros|mililitro|ml)\b/g, "$1ml")
      .replace(/(\d+(?:[.,]\d+)?)\s*(gramos|gramo|grs|gr|g)\b/g, "$1g")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function referenceKey(value) {
    return normalize(value).replace(/\s+/g, "");
  }

  function referenceTokens(value) {
    return normalize(value)
      .split(/\s+/)
      .filter(function (token) {
        return token.length > 2 || /\d/.test(token);
      });
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function readInventory() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("No se pudo leer el inventario de KefirControl", error);
      return [];
    }
  }

  function writeInventory(inventory) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
  }

  function readKefirProducts() {
    try {
      var parsed = JSON.parse(localStorage.getItem("kefir_products_v3") || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("No se pudo leer el catalogo local de productos", error);
      return [];
    }
  }

  function writeKefirProducts(products) {
    productCatalogWriteInProgress = true;
    try {
      localStorage.setItem("kefir_products_v3", JSON.stringify(products));
    } finally {
      productCatalogWriteInProgress = false;
    }
  }

  function isFinishedProduct(item) {
    var category = normalize(item && item.category);
    var name = normalize(item && item.name);

    if (category === "producto" || category === "finished_product") {
      return true;
    }

    if (category === "materia" || category === "raw_material") return false;
    if (category === "envase" || category === "supplies") return false;
    if (category === "insumo") return false;

    return (
      name.indexOf("kefir") !== -1 ||
      name.indexOf("queso") !== -1 ||
      name.indexOf("suero") !== -1 ||
      name.indexOf("kombucha") !== -1
    );
  }

  function getFinishedInventory() {
    return readInventory().filter(function (item) {
      return isFinishedProduct(item) && toNumber(item.quantity, 0) > 0;
    });
  }

  function isFinishedGeneralProduct(product) {
    return product && normalize(product.category) === "finished_product";
  }

  function getExplicitProductId(item) {
    var candidates = [
      item && item.generalProductId,
      item && item.inventoryProductId,
      item && item.productId,
    ];

    for (var index = 0; index < candidates.length; index += 1) {
      var value = Math.trunc(toNumber(candidates[index], 0));
      if (value > 0) return value;
    }

    return 0;
  }

  async function fetchGeneralProducts() {
    if (generalProductsPromise) return generalProductsPromise;

    var queryInput = encodeURIComponent(JSON.stringify({ 0: { json: null } }));
    generalProductsPromise = fetch(PRODUCTS_ENDPOINT + "&input=" + queryInput, {
      method: "GET",
      credentials: "include",
    })
      .then(async function (response) {
        var payload = await response.json().catch(function () {
          return null;
        });

        if (!response.ok) {
          var message =
            (payload &&
              payload[0] &&
              payload[0].error &&
              payload[0].error.json &&
              payload[0].error.json.message) ||
            "No se pudo leer el catalogo del inventario general.";
          throw new Error(message);
        }

        var products = readTrpcPayload(payload);
        return Array.isArray(products) ? products : [];
      })
      .catch(function (error) {
        generalProductsPromise = null;
        throw error;
      });

    return generalProductsPromise;
  }

  function findGeneralProductReference(item, generalProducts) {
    var finishedProducts = generalProducts.filter(isFinishedGeneralProduct);

    // Buscar por SKU (code) primero de forma precisa y exacta
    var itemCode = String(item && (item.code || item.productCode || item.id || "")).trim().toLowerCase();
    if (itemCode) {
      var codeMatch = finishedProducts.find(function (product) {
        var prodCode = String(product.code || "").trim().toLowerCase();
        return prodCode && prodCode === itemCode;
      });
      if (codeMatch) return { product: codeMatch, status: "linked" };
    }

    var explicitId = getExplicitProductId(item);

    if (explicitId > 0) {
      var explicitMatch = finishedProducts.find(function (product) {
        return Number(product.id) === explicitId;
      });
      if (explicitMatch) return { product: explicitMatch, status: "linked" };
    }

    var itemKey = referenceKey(item && item.name);
    var exactMatches = finishedProducts.filter(function (product) {
      return referenceKey(product.name) === itemKey;
    });

    if (exactMatches.length === 1) {
      return { product: exactMatches[0], status: "linked" };
    }

    if (exactMatches.length > 1) {
      return { product: null, status: "ambiguous" };
    }

    var itemTokens = referenceTokens(item && item.name);
    var tokenMatches = finishedProducts.filter(function (product) {
      var productTokens = new Set(referenceTokens(product.name));
      return (
        itemTokens.length > 0 &&
        itemTokens.every(function (token) {
          return productTokens.has(token);
        })
      );
    });

    if (tokenMatches.length === 1) {
      return { product: tokenMatches[0], status: "linked" };
    }

    return {
      product: null,
      status: tokenMatches.length > 1 ? "ambiguous" : "missing",
    };
  }

  function getLinkedFinishedInventory(generalProducts) {
    return getFinishedInventory().map(function (item) {
      var reference = findGeneralProductReference(item, generalProducts);
      return {
        item: item,
        linkedProduct: reference.product,
        linkStatus: reference.status,
      };
    });
  }

  function parsePresentation(product) {
    var name = product && product.name;
    var volumeMl = toNumber(product && product.presentationVolumeMl, 0);
    var weightGr = toNumber(product && product.presentationWeightGr, 0);
    var volumeMatch = normalize(name).match(/(\d+(?:[.,]\d+)?)(ml|l)\b/);
    var weightMatch = normalize(name).match(/(\d+(?:[.,]\d+)?)(g)\b/);

    if (volumeMl <= 0 && volumeMatch) {
      volumeMl =
        volumeMatch[2] === "l"
          ? toNumber(volumeMatch[1].replace(",", "."), 0) * 1000
          : toNumber(volumeMatch[1].replace(",", "."), 0);
    }

    if (weightGr <= 0 && weightMatch) {
      weightGr = toNumber(weightMatch[1].replace(",", "."), 0);
    }

    if (weightGr > 0 && volumeMl <= 0) {
      return { value: weightGr, unit: "g" };
    }

    return { value: volumeMl > 0 ? volumeMl : 1, unit: "ml" };
  }

  function inferProductType(name) {
    var text = normalize(name);
    if (text.indexOf("agua") !== -1) return "kefir_agua";
    if (text.indexOf("queso") !== -1) return "queso_directo";
    if (text.indexOf("suero") !== -1) return "suero";
    if (text.indexOf("kombucha") !== -1) return "kombucha";
    return "kefir";
  }

  function inferFlavor(name) {
    var text = normalize(name);
    var flavors = [
      "natural",
      "frutilla",
      "coco",
      "limon",
      "jengibre",
      "mango",
      "durazno",
      "vainilla",
      "chocolate",
    ];
    var flavor = flavors.find(function (item) {
      return text.indexOf(item) !== -1;
    });

    if (!flavor) return "Natural";
    return flavor.charAt(0).toUpperCase() + flavor.slice(1);
  }

  function priceFromProduct(product) {
    var rawPrice = toNumber(
      product && (product.salePrice || product.price || product.discountPrice),
      0
    );
    return rawPrice > 100 ? rawPrice / 100 : rawPrice;
  }

  function presentationFromKefirProduct(product) {
    var unit = normalize(product && product.unit);
    var volume = toNumber(product && product.volume, 0);

    if (unit === "l") {
      return { volumeMl: volume * 1000, weightGr: 0, presentationUnit: "ml" };
    }

    if (unit === "ml") {
      return { volumeMl: volume, weightGr: 0, presentationUnit: "ml" };
    }

    if (unit === "g" || unit === "gr") {
      return { volumeMl: 0, weightGr: volume, presentationUnit: "g" };
    }

    var parsed = parsePresentation(product);
    return parsed.unit === "g"
      ? { volumeMl: 0, weightGr: parsed.value, presentationUnit: "g" }
      : { volumeMl: parsed.value, weightGr: 0, presentationUnit: "ml" };
  }

  function buildInventoryProductInput(product) {
    var presentation = presentationFromKefirProduct(product);
    var salePrice = toNumber(product && product.sellPrice, 0);
    var code = String(product && product.id ? product.id : "").trim();

    if (!code) {
      code = "PROD-" + referenceKey(product && product.name).slice(0, 18);
    }

    return {
      code: code,
      name: String(product && product.name ? product.name : "Producto terminado"),
      category: "finished_product",
      price: 0,
      salePrice: salePrice,
      wholesalePrice: salePrice,
      discountPrice: salePrice,
      status: "active",
      unit: "unidad",
      presentationQuantity: 1,
      presentationUnit: presentation.presentationUnit,
      presentationVolumeMl: presentation.volumeMl,
      presentationWeightGr: presentation.weightGr,
      productionRole: "finished_good",
      storageLocation: "Inventario General",
      supplierName: "Produccion",
      productionNotes: "Creado automaticamente desde KefirControl",
    };
  }

  async function createGeneralProductFromKefirProduct(product) {
    var input = buildInventoryProductInput(product);
    var response = await fetch(CREATE_PRODUCT_ENDPOINT, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 0: { json: input } }),
    });
    var payload = await response.json().catch(function () {
      return null;
    });

    if (!response.ok) {
      var message =
        (payload &&
          payload[0] &&
          payload[0].error &&
          payload[0].error.json &&
          payload[0].error.json.message) ||
        (payload && payload[0] && payload[0].error && payload[0].error.message) ||
        "No se pudo crear el producto en inventario general.";
      throw new Error(message);
    }

    return readTrpcPayload(payload);
  }

  async function syncKefirProductsOnServer(products) {
    var response = await fetch(SYNC_PRODUCTS_ENDPOINT, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 0: { json: { products: products } } }),
    });
    var payload = await response.json().catch(function () {
      return null;
    });

    if (!response.ok) {
      var message =
        (payload &&
          payload[0] &&
          payload[0].error &&
          payload[0].error.json &&
          payload[0].error.json.message) ||
        (payload && payload[0] && payload[0].error && payload[0].error.message) ||
        "No se pudo sincronizar productos con inventario general.";
      throw new Error(message);
    }

    return readTrpcPayload(payload);
  }

  function buildKefirProduct(product) {
    var presentation = parsePresentation(product);
    return {
      id: product.code || "INV-" + product.id,
      generalProductId: Number(product.id),
      name: product.name,
      type: inferProductType(product.name),
      flavor: inferFlavor(product.name),
      volume: presentation.value,
      unit: presentation.unit,
      envaseItemId: 0,
      tapaItemId: 0,
      etiquetaItemId: 0,
      sellPrice: priceFromProduct(product),
    };
  }

  function mergeGeneralProductsIntoLocal(localProducts, generalProducts) {
    var finishedProducts = generalProducts.filter(isFinishedGeneralProduct);
    var mergedProducts = localProducts.map(function (product) {
      var reference = findGeneralProductReference(product, generalProducts);
      if (!reference.product) return product;

      return Object.assign({}, product, {
        generalProductId: Number(reference.product.id),
      });
    });

    finishedProducts.forEach(function (generalProduct) {
      var exists = mergedProducts.some(function (product) {
        return (
          Number(product.generalProductId) === Number(generalProduct.id) ||
          referenceKey(product.name) === referenceKey(generalProduct.name)
        );
      });

      if (!exists) {
        mergedProducts.push(buildKefirProduct(generalProduct));
      }
    });

    return mergedProducts;
  }

  async function syncProductionProductCatalog(generalProducts) {
    if (productCatalogSyncRunning) return;
    productCatalogSyncRunning = true;

    try {
      var localProducts = readKefirProducts();
      var serverSync = await syncKefirProductsOnServer(localProducts);
      var mappings = Array.isArray(serverSync && serverSync.mappings)
        ? serverSync.mappings
        : [];
      var mappingsByLocalId = new Map(
        mappings.map(function (mapping) {
          return [String(mapping.localId), mapping];
        })
      );

      var linkedLocalProducts = localProducts.map(function (product) {
        var localKeys = [
          product && product.id,
          product && product.code,
          product && product.name,
        ].map(function (value) {
          return String(value || "");
        });
        var mapping = localKeys
          .map(function (key) {
            return mappingsByLocalId.get(key);
          })
          .find(Boolean);

        return mapping
          ? Object.assign({}, product, { generalProductId: Number(mapping.productId) })
          : product;
      });

      var createdProduct = mappings.some(function (mapping) {
        return !!mapping.created;
      });

      if (createdProduct || mappings.length) {
        generalProductsPromise = null;
        generalProducts = await fetchGeneralProducts();
      }

      var mergedProducts = mergeGeneralProductsIntoLocal(
        linkedLocalProducts,
        generalProducts
      );

      var nextText = JSON.stringify(mergedProducts);
      var currentText = localStorage.getItem("kefir_products_v3") || "[]";
      if (currentText === nextText) {
        sessionStorage.removeItem("kefir_products_synced_once");
        return;
      }

      writeKefirProducts(mergedProducts);

      if (
        location.pathname.indexOf("/kefir-control/productos") !== -1 &&
        sessionStorage.getItem("kefir_products_synced_once") !== "true"
      ) {
        sessionStorage.setItem("kefir_products_synced_once", "true");
        location.reload();
      }
    } finally {
      productCatalogSyncRunning = false;
    }
  }

  function preloadGeneralCatalog() {
    fetchGeneralProducts()
      .then(syncProductionProductCatalog)
      .catch(function (error) {
        console.warn("No se pudo sincronizar productos de KefirControl", error);
      });
  }

  function scheduleProductCatalogSync() {
    window.clearTimeout(productCatalogSyncTimer);
    productCatalogSyncTimer = window.setTimeout(function () {
      generalProductsPromise = null;
      preloadGeneralCatalog();
    }, 500);
  }

  function installProductCatalogStorageSync() {
    if (localStorage.__kefirProductCatalogSyncInstalled) return;

    var previousSetItem = localStorage.setItem;
    localStorage.setItem = function (key, value) {
      previousSetItem.apply(this, arguments);

      if (key === "kefir_products_v3" && !productCatalogWriteInProgress) {
        scheduleProductCatalogSync();
      }
    };

    localStorage.__kefirProductCatalogSyncInstalled = true;
  }

  function getSelectedRows() {
    return Array.from(
      document.querySelectorAll("[data-transfer-general-quantity]")
    )
      .map(function (input) {
        var id = input.getAttribute("data-transfer-general-quantity");
        var row = modalRows.find(function (entry) {
          return String(entry.item.id) === String(id);
        });
        var quantity = toNumber(input.value, 0);
        if (!row || !row.linkedProduct || quantity <= 0) return null;

        return {
          sourceId: row.item.id,
          productId: Number(row.linkedProduct.id),
          productName: row.linkedProduct.name,
          quantity: Math.min(quantity, toNumber(row.item.quantity, 0)),
          unit: row.linkedProduct.unit || row.item.unit || "unidad",
          available: toNumber(row.item.quantity, 0),
        };
      })
      .filter(Boolean);
  }

  function readTrpcPayload(payload) {
    var entry = Array.isArray(payload) ? payload[0] : payload && payload[0];
    if (!entry) entry = payload;

    if (entry && entry.error) {
      throw new Error(
        (entry.error.json && entry.error.json.message) ||
          entry.error.message ||
          "No se pudo registrar el traspaso."
      );
    }

    var data = entry && entry.result ? entry.result.data : entry;
    if (data && data.json) return data.json;
    return data;
  }

  async function callTransferToGeneral(rows, notes) {
    var input = {
      items: rows.map(function (row) {
        return {
          productId: row.productId,
          productName: row.productName,
          quantity: row.quantity,
        };
      }),
      notes: notes || undefined,
    };

    var response = await fetch(TRANSFER_ENDPOINT, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 0: { json: input } }),
    });

    var payload = await response.json().catch(function () {
      return null;
    });

    if (!response.ok) {
      var message =
        (payload &&
          payload[0] &&
          payload[0].error &&
          payload[0].error.json &&
          payload[0].error.json.message) ||
        (payload && payload[0] && payload[0].error && payload[0].error.message) ||
        (payload &&
          payload.error &&
          payload.error.json &&
          payload.error.json.message) ||
        (payload && payload.error && payload.error.message) ||
        "No se pudo registrar el traspaso.";
      throw new Error(message);
    }

    var receipt = readTrpcPayload(payload);
    if (!receipt || !receipt.success || !receipt.items || !receipt.items.length) {
      throw new Error(
        "No se encontro el producto terminado en el inventario general. Revise que el nombre del producto exista en el catalogo principal."
      );
    }

    return receipt;
  }

  function deductTransferredRows(rows) {
    var selectedById = new Map(
      rows.map(function (row) {
        return [String(row.sourceId), row.quantity];
      })
    );

    var nextInventory = readInventory().map(function (item) {
      var selectedQuantity = selectedById.get(String(item.id));
      if (!selectedQuantity) return item;

      return Object.assign({}, item, {
        quantity: Math.max(0, toNumber(item.quantity, 0) - selectedQuantity),
      });
    });

    writeInventory(nextInventory);
  }

  function buildReceiptMessage(receipt) {
    var lines = [
      "Traspaso a Inventario General",
      "Nro: " + receipt.transferNumber,
      "Fecha: " + new Date(receipt.createdAt || Date.now()).toLocaleString("es-BO"),
      "",
      "Producto terminado liberado para comercializacion:",
    ];

    (receipt.items || []).forEach(function (item) {
      lines.push(
        "- " +
          item.productName +
          ": " +
          item.quantity +
          " " +
          (item.productUnit || item.unit || "unidad")
      );
    });

    if (receipt.notes) {
      lines.push("", "Notas: " + receipt.notes);
    }

    lines.push("", "KefirControl");
    return lines.join("\n");
  }

  function printReceipt(receipt) {
    var itemsHtml = (receipt.items || [])
      .map(function (item) {
        return (
          "<tr><td>" +
          escapeHtml(item.productName) +
          "</td><td>" +
          escapeHtml(item.quantity) +
          "</td><td>" +
          escapeHtml(item.productUnit || item.unit || "unidad") +
          "</td></tr>"
        );
      })
      .join("");
    var date = new Date(receipt.createdAt || Date.now()).toLocaleString("es-BO");

    var win = window.open("", "_blank", "width=860,height=720");
    if (!win) {
      alert("El navegador bloqueo la ventana de impresion.");
      return;
    }

    win.document.write(
      "<!doctype html><html><head><title>Traspaso " +
        escapeHtml(receipt.transferNumber) +
        "</title><style>body{font-family:Arial,sans-serif;color:#0f172a;margin:32px}.head{border-bottom:2px solid #0f172a;padding-bottom:14px;margin-bottom:18px}h1{font-size:22px;margin:0 0 6px}.meta{font-size:13px;color:#475569;line-height:1.6}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #cbd5e1;padding:10px;text-align:left;font-size:13px}th{background:#f1f5f9}.sign{display:flex;gap:80px;margin-top:64px}.sign div{border-top:1px solid #0f172a;width:220px;text-align:center;padding-top:8px;font-size:12px}</style></head><body><div class='head'><h1>Traspaso a Inventario General</h1><div class='meta'>Nro: " +
        escapeHtml(receipt.transferNumber) +
        "<br>Fecha: " +
        escapeHtml(date) +
        "<br>Destino: Inventario General - Comercializacion</div></div><table><thead><tr><th>Producto terminado</th><th>Cantidad</th><th>Unidad</th></tr></thead><tbody>" +
        itemsHtml +
        "</tbody></table>" +
        (receipt.notes
          ? "<p class='meta'><strong>Notas:</strong> " +
            escapeHtml(receipt.notes) +
            "</p>"
          : "") +
        "<div class='sign'><div>Entrega Produccion</div><div>Recibe Inventario General</div></div><script>window.onload=function(){window.print();};<\/script></body></html>"
    );
    win.document.close();
  }

  function shareReceipt(receipt) {
    var text = encodeURIComponent(buildReceiptMessage(receipt));
    window.open("https://api.whatsapp.com/send?text=" + text, "_blank");
  }

  function setStatus(message, type) {
    var status = document.querySelector("[data-transfer-general-status]");
    if (!status) return;
    status.textContent = message || "";
    status.style.display = message ? "block" : "none";
    status.style.background = type === "error" ? "#fef2f2" : "#ecfdf5";
    status.style.color = type === "error" ? "#b91c1c" : "#047857";
    status.style.borderColor = type === "error" ? "#fecaca" : "#a7f3d0";
  }

  function renderReceiptActions(receipt) {
    var target = document.querySelector("[data-transfer-general-receipt]");
    if (!target) return;

    target.innerHTML =
      "<div class='kefir-transfer-done'><strong>Traspaso " +
      escapeHtml(receipt.transferNumber) +
      " registrado.</strong><span>Producto listo para comercializacion.</span><div class='kefir-transfer-actions'><button type='button' data-print-transfer>Imprimir</button><button type='button' data-whatsapp-transfer>WhatsApp</button></div></div>";

    target.querySelector("[data-print-transfer]").onclick = function () {
      printReceipt(receipt);
    };
    target.querySelector("[data-whatsapp-transfer]").onclick = function () {
      shareReceipt(receipt);
    };
  }

  async function submitTransfer(event) {
    event.preventDefault();
    setStatus("", "success");

    var rows = getSelectedRows();
    if (!rows.length) {
      setStatus("Seleccione al menos un producto terminado.", "error");
      return;
    }

    var notesInput = document.querySelector("[data-transfer-general-notes]");
    var notes = notesInput ? notesInput.value.trim() : "";
    var submitButton = document.querySelector("[data-transfer-general-submit]");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Registrando...";
    }

    try {
      var receipt = await callTransferToGeneral(rows, notes);
      currentReceipt = receipt;
      deductTransferredRows(rows);
      pendingReload = true;
      setStatus("Traspaso registrado correctamente.", "success");
      renderReceiptActions(receipt);
    } catch (error) {
      setStatus(error.message || "No se pudo registrar el traspaso.", "error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Registrar Traspaso";
      }
    }
  }

  function closeModal() {
    var modal = document.querySelector("[data-transfer-general-modal]");
    if (modal) modal.remove();
    if (pendingReload) window.location.reload();
  }

  function renderTransferRows(rows) {
    var list = document.querySelector(".kefir-transfer-list");
    var submitButton = document.querySelector("[data-transfer-general-submit]");
    if (!list) return;

    var linkedRows = rows.filter(function (row) {
      return !!row.linkedProduct;
    });

    if (!rows.length) {
      list.innerHTML =
        "<div class='kefir-transfer-empty'>No hay producto terminado con stock en planta.</div>";
      if (submitButton) submitButton.disabled = true;
      return;
    }

    list.innerHTML = rows
      .map(function (row) {
        var item = row.item;
        var quantity = toNumber(item.quantity, 0);
        var linkedProduct = row.linkedProduct;
        var referenceText = linkedProduct
          ? "Ref. general: " +
            escapeHtml(linkedProduct.code || "ID " + linkedProduct.id) +
            " - " +
            escapeHtml(linkedProduct.name)
          : row.linkStatus === "ambiguous"
            ? "Referencia ambigua: revise el SKU exacto en inventario general"
            : "Sin referencia en inventario general";
        var disabled = linkedProduct ? "" : " disabled";

        return (
          "<div class='kefir-transfer-row " +
          (linkedProduct ? "" : "is-unlinked") +
          "'><div><strong>" +
          escapeHtml(item.name) +
          "</strong><span>Disponible: " +
          escapeHtml(quantity) +
          " " +
          escapeHtml(item.unit || "unidad") +
          "</span><small>" +
          referenceText +
          "</small></div><input data-transfer-general-quantity='" +
          escapeHtml(item.id) +
          "' type='number' min='0' max='" +
          escapeHtml(quantity) +
          "' step='1' placeholder='0'" +
          disabled +
          "></div>"
        );
      })
      .join("");

    if (submitButton) submitButton.disabled = linkedRows.length === 0;
  }

  async function openModal() {
    if (document.querySelector("[data-transfer-general-modal]")) return;

    var modal = document.createElement("div");
    modal.dataset.transferGeneralModal = "true";
    modal.className = "kefir-transfer-modal";
    modal.innerHTML =
      "<div class='kefir-transfer-panel'><div class='kefir-transfer-header'><div><h2>Traspasar a Inventario General</h2><p>Producto terminado enlazado por SKU del inventario general</p></div><button type='button' data-transfer-general-close aria-label='Cerrar'>x</button></div><form data-transfer-general-form><div class='kefir-transfer-list'><div class='kefir-transfer-empty'>Validando referencias del inventario general...</div></div><label class='kefir-transfer-label'>Notas<input data-transfer-general-notes type='text' value='Producto terminado liberado para comercializacion' maxlength='180'></label><div data-transfer-general-status class='kefir-transfer-status'></div><div data-transfer-general-receipt></div><div class='kefir-transfer-footer'><button type='button' data-transfer-general-close>Cancelar</button><button type='submit' data-transfer-general-submit disabled>Registrar Traspaso</button></div></form></div>";

    document.body.appendChild(modal);
    modal.querySelectorAll("[data-transfer-general-close]").forEach(function (button) {
      button.addEventListener("click", closeModal);
    });
    modal
      .querySelector("[data-transfer-general-form]")
      .addEventListener("submit", submitTransfer);

    try {
      var generalProducts = await fetchGeneralProducts();
      modalRows = getLinkedFinishedInventory(generalProducts);
      renderTransferRows(modalRows);
    } catch (error) {
      setStatus(
        error.message ||
          "No se pudo validar el catalogo del inventario general.",
        "error"
      );
      renderTransferRows([]);
    }
  }

  function ensureStyles() {
    if (document.querySelector("[data-transfer-general-styles]")) return;

    var style = document.createElement("style");
    style.dataset.transferGeneralStyles = "true";
    style.textContent =
      ".kefir-transfer-button{display:flex;align-items:center;gap:10px;width:100%;border:1px solid rgba(16,185,129,.35);background:linear-gradient(135deg,#10b981,#059669);color:#fff;border-radius:14px;padding:12px 14px;font-weight:800;font-size:13px;cursor:pointer;box-shadow:0 10px 20px rgba(16,185,129,.18);margin-bottom:10px}.kefir-transfer-floating{position:fixed;right:22px;bottom:22px;z-index:999998;width:auto;border-radius:999px;padding:12px 18px}.kefir-transfer-modal{position:fixed;inset:0;z-index:999999;background:rgba(15,23,42,.46);display:flex;align-items:center;justify-content:center;padding:18px}.kefir-transfer-panel{width:min(720px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 24px 80px rgba(15,23,42,.25);border:1px solid #e2e8f0}.kefir-transfer-header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;border-bottom:1px solid #e2e8f0;padding:18px 20px}.kefir-transfer-header h2{margin:0;color:#0f172a;font-size:20px}.kefir-transfer-header p{margin:4px 0 0;color:#64748b;font-size:13px}.kefir-transfer-header button{border:0;background:#f1f5f9;color:#475569;width:34px;height:34px;border-radius:10px;font-weight:800;cursor:pointer}.kefir-transfer-list{padding:16px 20px;display:flex;flex-direction:column;gap:10px}.kefir-transfer-row{display:flex;align-items:center;justify-content:space-between;gap:14px;border:1px solid #e2e8f0;border-radius:14px;padding:12px 14px}.kefir-transfer-row.is-unlinked{border-color:#fecaca;background:#fef2f2}.kefir-transfer-row strong{display:block;color:#0f172a;font-size:14px}.kefir-transfer-row span{display:block;color:#64748b;font-size:12px;margin-top:2px}.kefir-transfer-row small{display:block;color:#0f766e;font-size:11px;font-weight:800;margin-top:4px}.kefir-transfer-row.is-unlinked small{color:#b91c1c}.kefir-transfer-row input{width:96px;border:1px solid #cbd5e1;border-radius:10px;padding:9px 10px;font-size:14px;text-align:right}.kefir-transfer-row input:disabled{background:#f1f5f9;color:#94a3b8}.kefir-transfer-label{display:block;margin:0 20px 14px;color:#334155;font-size:12px;font-weight:800;text-transform:uppercase}.kefir-transfer-label input{display:block;width:100%;box-sizing:border-box;margin-top:6px;border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;font-size:14px;text-transform:none;font-weight:500}.kefir-transfer-status{display:none;margin:0 20px 14px;border:1px solid;border-radius:12px;padding:10px 12px;font-size:13px;font-weight:700}.kefir-transfer-empty{border:1px dashed #cbd5e1;border-radius:14px;padding:24px;text-align:center;color:#64748b;font-size:14px}.kefir-transfer-done{margin:0 20px 14px;border:1px solid #a7f3d0;background:#ecfdf5;border-radius:14px;padding:12px;color:#047857}.kefir-transfer-done strong,.kefir-transfer-done span{display:block}.kefir-transfer-done span{font-size:13px;margin-top:3px}.kefir-transfer-actions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}.kefir-transfer-actions button,.kefir-transfer-footer button{border-radius:10px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;padding:10px 14px;font-weight:800;cursor:pointer}.kefir-transfer-actions button:last-child{background:#25d366;color:#fff;border-color:#25d366}.kefir-transfer-footer{display:flex;justify-content:flex-end;gap:10px;border-top:1px solid #e2e8f0;padding:14px 20px}.kefir-transfer-footer button[type=submit]{background:#10b981;border-color:#10b981;color:#fff}.kefir-transfer-footer button:disabled{opacity:.55;cursor:not-allowed}@media(max-width:640px){.kefir-transfer-row{align-items:stretch;flex-direction:column}.kefir-transfer-row input{width:100%;text-align:left}.kefir-transfer-footer{flex-direction:column-reverse}.kefir-transfer-footer button{width:100%}}";
    document.head.appendChild(style);
  }

  function ensureButton() {
    var existingButton = document.querySelector("[data-transfer-general-button]");
    var footer = document.querySelector(".sidebar-footer");
    if (existingButton) {
      if (footer && existingButton.parentElement !== footer) {
        existingButton.classList.remove("kefir-transfer-floating");
        footer.prepend(existingButton);
        return true;
      }
      return !existingButton.classList.contains("kefir-transfer-floating");
    }

    var button = document.createElement("button");
    button.type = "button";
    button.dataset.transferGeneralButton = "true";
    button.className = "kefir-transfer-button";
    button.innerHTML =
      "<span aria-hidden='true'>&harr;</span><span>Traspasar producto terminado</span>";
    button.addEventListener("click", openModal);

    if (footer) {
      footer.prepend(button);
      return true;
    }

    button.className += " kefir-transfer-floating";
    document.body.appendChild(button);
    return true;
  }

  function install() {
    ensureStyles();
    ensureButton();
    installProductCatalogStorageSync();
    preloadGeneralCatalog();
  }

  window.KefirTransferToGeneral = {
    open: openModal,
    print: function () {
      if (currentReceipt) printReceipt(currentReceipt);
    },
    share: function () {
      if (currentReceipt) shareReceipt(currentReceipt);
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else {
    install();
  }

  var attempts = 0;
  var timer = window.setInterval(function () {
    attempts += 1;
    if (ensureButton() || attempts >= 40) {
      window.clearInterval(timer);
    }
  }, 150);
})();
