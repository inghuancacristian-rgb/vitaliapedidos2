/**
 * Utilidades para formatear moneda en pesos bolivianos (Bs.)
 */

/**
 * Formatea un número a pesos bolivianos con punto como separador de centavos
 * @param amount Cantidad en centavos (ej: 5000 = Bs. 50.00)
 * @returns String formateado (ej: "Bs. 50.00")
 */
export function formatCurrency(amount: number): string {
  const bolivianos = amount / 100;
  return `Bs. ${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(bolivianos)}`;
}

/**
 * Convierte un string de entrada a centavos
 * @param input String del usuario (ej: "50.50" o "50")
 * @returns Cantidad en centavos (ej: 5050)
 */
export function parsePrice(input: string): number {
  const cleaned = input.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");

  if (parts.length === 1) {
    // Si solo hay un número, asumir que son bolivianos
    return parseInt(parts[0] || "0") * 100;
  } else {
    // Si hay punto, la parte después es centavos
    const bolivianos = parseInt(parts[0] || "0");
    const centavosStr = (parts[1] || "").padEnd(2, "0").substring(0, 2);
    const centavos = parseInt(centavosStr || "0");
    return bolivianos * 100 + centavos;
  }
}

/**
 * Formatea un número para mostrar en input (sin símbolo de moneda)
 * @param amount Cantidad en centavos
 * @returns String formateado (ej: "50.00")
 */
export function formatPriceInput(amount: number): string {
  const bolivianos = Math.floor(amount / 100);
  const centavos = amount % 100;
  return `${bolivianos}.${centavos.toString().padStart(2, "0")}`;
}

/**
 * Parsea un input de texto que representa moneda, aceptando comas o puntos como decimales.
 * Evita el problema del navegador con type="number" donde 55.00 se convierte en 5500.
 */
export function parseInputAmount(value: string | number): number {
  if (!value) return 0;
  if (typeof value === "number") return value;
  
  // Reemplazar coma por punto para el parseo
  let cleaned = value.replace(/,/g, '.');
  
  // Si alguien pone múltiples puntos o formato raro, nos quedamos con el parseo básico
  // Ya que este input es type="text", el usuario verá exactamente lo que escribe.
  return parseFloat(cleaned) || 0;
}
