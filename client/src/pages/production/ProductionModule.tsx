import { useLocation } from "wouter";
import ProductionLayout from "./ProductionLayout";
import ProductionHome from "./ProductionHome";
import ProductionInventory from "./ProductionInventory";
import ProductionBatches from "./ProductionBatches";
import ProductionAudit from "./ProductionAudit";
import ProductionQuality from "./ProductionQuality";
import ProductionCosts from "./ProductionCosts";
import ProductionYields from "./ProductionYields";
// Importar los módulos faltantes (se crearán a continuación)
import ProductionNodules from "./ProductionNodules";
import ProductionReports from "./ProductionReports";
import ProductionOrders from "./ProductionOrders";
import ProductionProducts from "./ProductionProducts";

export default function ProductionModule() {
  const [location] = useLocation();

  // Determinamos qué componente mostrar basándonos en la URL
  const renderContent = () => {
    if (location === "/production/inventory") return <ProductionInventory />;
    if (location === "/production/batches") return <ProductionBatches />;
    if (location === "/production/audit") return <ProductionAudit />;
    if (location === "/production/quality") return <ProductionQuality />;
    if (location === "/production/costs") return <ProductionCosts />;
    if (location === "/production/yields") return <ProductionYields />;
    if (location === "/production/nodules") return <ProductionNodules />;
    if (location === "/production/reports") return <ProductionReports />;
    if (location === "/production/orders") return <ProductionOrders />;
    if (location === "/production/products") return <ProductionProducts />;

    // Por defecto (incluyendo /production y /production/home)
    return <ProductionHome />;
  };

  return (
    <ProductionLayout>
      {renderContent()}
    </ProductionLayout>
  );
}
