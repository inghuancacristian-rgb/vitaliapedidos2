import { getDb, cashClosures, financialTransactions } from "./db";
import { eq, and, sql } from "drizzle-orm";
import { processFinancialLiquidation } from "./db";

async function repair() {
  console.log("Iniciando reparación de saldos financieros...");
  const db = await getDb();
  if (!db) {
    console.log("No se pudo conectar a la base de datos.");
    return;
  }

  // Buscar el cierre de hoy que está causando el problema
  const today = new Date().toISOString().split('T')[0];
  const activeClosures = await db.select().from(cashClosures).where(
    eq(cashClosures.status, "approved" as any)
  );

  console.log(`Encontrados ${activeClosures.length} cierres aprobados.`);

  for (const closure of activeClosures) {
    console.log(`Procesando liquidación para el cierre #${closure.id}...`);
    await processFinancialLiquidation(closure.id);
  }

  console.log("Reparación completada. Por favor, refresca la aplicación.");
}

repair().catch(console.error);
