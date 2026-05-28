(function () {
  var STORAGE_KEY = "kefir_inventory_v3";
  var TRANSFER_ENDPOINT = "/api/trpc/inventory.transferToGeneral?batch=1";
  var pendingReload = false;
  var currentReceipt = null;

  function toNumber(value, fallback) {
    var numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : fallback;
  }

  function normalize(value) {
    return String(value == null ? "" : value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
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

  function getSelectedRows() {
    return Array.from(
      document.querySelectorAll("[data-transfer-general-quantity]")
    )
      .map(function (input) {
        var id = input.getAttribute("data-transfer-general-quantity");
        var item = getFinishedInventory().find(function (entry) {
          return String(entry.id) === String(id);
        });
        var quantity = toNumber(input.value, 0);
        if (!item || quantity <= 0) return null;

        return {
          sourceId: item.id,
          productId: 0,
          productName: item.name,
          quantity: Math.min(quantity, toNumber(item.quantity, 0)),
          unit: item.unit || "unidad",
          available: toNumber(item.quantity, 0),
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
          productId: 0,
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

  function openModal() {
    if (document.querySelector("[data-transfer-general-modal]")) return;

    var items = getFinishedInventory();
    var rowsHtml = items.length
      ? items
          .map(function (item) {
            var quantity = toNumber(item.quantity, 0);
            return (
              "<div class='kefir-transfer-row'><div><strong>" +
              escapeHtml(item.name) +
              "</strong><span>Disponible: " +
              escapeHtml(quantity) +
              " " +
              escapeHtml(item.unit || "unidad") +
              "</span></div><input data-transfer-general-quantity='" +
              escapeHtml(item.id) +
              "' type='number' min='0' max='" +
              escapeHtml(quantity) +
              "' step='1' placeholder='0'></div>"
            );
          })
          .join("")
      : "<div class='kefir-transfer-empty'>No hay producto terminado con stock en planta.</div>";

    var modal = document.createElement("div");
    modal.dataset.transferGeneralModal = "true";
    modal.className = "kefir-transfer-modal";
    modal.innerHTML =
      "<div class='kefir-transfer-panel'><div class='kefir-transfer-header'><div><h2>Traspasar a Inventario General</h2><p>Producto terminado para comercializacion</p></div><button type='button' data-transfer-general-close aria-label='Cerrar'>x</button></div><form data-transfer-general-form><div class='kefir-transfer-list'>" +
      rowsHtml +
      "</div><label class='kefir-transfer-label'>Notas<input data-transfer-general-notes type='text' value='Producto terminado liberado para comercializacion' maxlength='180'></label><div data-transfer-general-status class='kefir-transfer-status'></div><div data-transfer-general-receipt></div><div class='kefir-transfer-footer'><button type='button' data-transfer-general-close>Cancelar</button><button type='submit' data-transfer-general-submit " +
      (items.length ? "" : "disabled") +
      ">Registrar Traspaso</button></div></form></div>";

    document.body.appendChild(modal);
    modal.querySelectorAll("[data-transfer-general-close]").forEach(function (button) {
      button.addEventListener("click", closeModal);
    });
    modal
      .querySelector("[data-transfer-general-form]")
      .addEventListener("submit", submitTransfer);
  }

  function ensureStyles() {
    if (document.querySelector("[data-transfer-general-styles]")) return;

    var style = document.createElement("style");
    style.dataset.transferGeneralStyles = "true";
    style.textContent =
      ".kefir-transfer-button{display:flex;align-items:center;gap:10px;width:100%;border:1px solid rgba(16,185,129,.35);background:linear-gradient(135deg,#10b981,#059669);color:#fff;border-radius:14px;padding:12px 14px;font-weight:800;font-size:13px;cursor:pointer;box-shadow:0 10px 20px rgba(16,185,129,.18);margin-bottom:10px}.kefir-transfer-floating{position:fixed;right:22px;bottom:22px;z-index:999998;width:auto;border-radius:999px;padding:12px 18px}.kefir-transfer-modal{position:fixed;inset:0;z-index:999999;background:rgba(15,23,42,.46);display:flex;align-items:center;justify-content:center;padding:18px}.kefir-transfer-panel{width:min(720px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 24px 80px rgba(15,23,42,.25);border:1px solid #e2e8f0}.kefir-transfer-header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;border-bottom:1px solid #e2e8f0;padding:18px 20px}.kefir-transfer-header h2{margin:0;color:#0f172a;font-size:20px}.kefir-transfer-header p{margin:4px 0 0;color:#64748b;font-size:13px}.kefir-transfer-header button{border:0;background:#f1f5f9;color:#475569;width:34px;height:34px;border-radius:10px;font-weight:800;cursor:pointer}.kefir-transfer-list{padding:16px 20px;display:flex;flex-direction:column;gap:10px}.kefir-transfer-row{display:flex;align-items:center;justify-content:space-between;gap:14px;border:1px solid #e2e8f0;border-radius:14px;padding:12px 14px}.kefir-transfer-row strong{display:block;color:#0f172a;font-size:14px}.kefir-transfer-row span{display:block;color:#64748b;font-size:12px;margin-top:2px}.kefir-transfer-row input{width:96px;border:1px solid #cbd5e1;border-radius:10px;padding:9px 10px;font-size:14px;text-align:right}.kefir-transfer-label{display:block;margin:0 20px 14px;color:#334155;font-size:12px;font-weight:800;text-transform:uppercase}.kefir-transfer-label input{display:block;width:100%;box-sizing:border-box;margin-top:6px;border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;font-size:14px;text-transform:none;font-weight:500}.kefir-transfer-status{display:none;margin:0 20px 14px;border:1px solid;border-radius:12px;padding:10px 12px;font-size:13px;font-weight:700}.kefir-transfer-empty{border:1px dashed #cbd5e1;border-radius:14px;padding:24px;text-align:center;color:#64748b;font-size:14px}.kefir-transfer-done{margin:0 20px 14px;border:1px solid #a7f3d0;background:#ecfdf5;border-radius:14px;padding:12px;color:#047857}.kefir-transfer-done strong,.kefir-transfer-done span{display:block}.kefir-transfer-done span{font-size:13px;margin-top:3px}.kefir-transfer-actions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}.kefir-transfer-actions button,.kefir-transfer-footer button{border-radius:10px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;padding:10px 14px;font-weight:800;cursor:pointer}.kefir-transfer-actions button:last-child{background:#25d366;color:#fff;border-color:#25d366}.kefir-transfer-footer{display:flex;justify-content:flex-end;gap:10px;border-top:1px solid #e2e8f0;padding:14px 20px}.kefir-transfer-footer button[type=submit]{background:#10b981;border-color:#10b981;color:#fff}.kefir-transfer-footer button:disabled{opacity:.55;cursor:not-allowed}@media(max-width:640px){.kefir-transfer-row{align-items:stretch;flex-direction:column}.kefir-transfer-row input{width:100%;text-align:left}.kefir-transfer-footer{flex-direction:column-reverse}.kefir-transfer-footer button{width:100%}}";
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
