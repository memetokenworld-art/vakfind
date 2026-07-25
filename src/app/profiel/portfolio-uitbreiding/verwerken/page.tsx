import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PortfolioExtensionProcessing } from "@/components/PortfolioExtensionProcessing";

// Landingspagina direct na terugkeer van Mollie checkout voor de
// portfolio-uitbreiding — zelfde pollpatroon als /portfel/verwerken.
export default async function PortfolioExtensionProcessingPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string }>;
}) {
  const { order_id: orderId } = await searchParams;

  if (!orderId) {
    redirect("/profiel");
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <PortfolioExtensionProcessing orderId={orderId} />
      <Footer />
    </div>
  );
}
