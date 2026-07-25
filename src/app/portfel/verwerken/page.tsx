import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TopUpProcessing } from "@/components/TopUpProcessing";

// Landingspagina direct na terugkeer van Mollie checkout (redirectUrl).
// Het pollen (herhaald checken tot een eindstatus bekend is) gebeurt in
// TopUpProcessing — een client component, want dat kan een server-side
// render niet.
export default async function TopUpProcessingPage({
  searchParams,
}: {
  searchParams: Promise<{ payment_id?: string }>;
}) {
  const { payment_id: paymentId } = await searchParams;

  if (!paymentId) {
    redirect("/portfel");
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <TopUpProcessing paymentId={paymentId} />
      <Footer />
    </div>
  );
}
