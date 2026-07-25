import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { finalizePortfolioExtensionPurchase } from "@/app/profiel/actions";

// Landingspagina direct na terugkeer van Mollie checkout voor de
// portfolio-uitbreiding — zelfde patroon als /portfel/verwerken.
export default async function PortfolioExtensionProcessingPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string }>;
}) {
  const { order_id: orderId } = await searchParams;

  if (!orderId) {
    redirect("/profiel");
  }

  let status: "paid" | "pending" | "open" | "failed" | "canceled" | "expired" = "pending";
  let errorMessage: string | null = null;

  try {
    const result = await finalizePortfolioExtensionPurchase(orderId);
    status = result.status;
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Er ging iets mis.";
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        {status === "paid" && (
          <>
            <p className="text-4xl">✅</p>
            <h1 className="mt-4 text-lg font-bold text-vak-navy">Portfolio uitgebreid</h1>
            <p className="mt-2 text-sm text-gray-500">
              Je hebt 30 dagen extra ruimte: 30 foto&apos;s en 10 video&apos;s.
            </p>
          </>
        )}

        {(status === "pending" || status === "open") && !errorMessage && (
          <>
            <p className="text-4xl">⏳</p>
            <h1 className="mt-4 text-lg font-bold text-vak-navy">Betaling wordt verwerkt</h1>
            <p className="mt-2 text-sm text-gray-500">
              Dit kan even duren. Ververs deze pagina zo nodig, of ga terug naar
              je profiel.
            </p>
          </>
        )}

        {(status === "failed" || status === "canceled" || status === "expired") && (
          <>
            <p className="text-4xl">✕</p>
            <h1 className="mt-4 text-lg font-bold text-vak-navy">Betaling niet gelukt</h1>
            <p className="mt-2 text-sm text-gray-500">
              De betaling is niet afgerond. Je limiet is niet uitgebreid.
            </p>
          </>
        )}

        {errorMessage && <p className="mt-2 text-xs text-red-500">{errorMessage}</p>}

        <Link
          href="/profiel"
          className="mt-6 inline-block rounded bg-vak-navy px-6 py-3 text-sm font-semibold text-vak-gold transition hover:bg-vak-navy-light"
        >
          Naar mijn profiel
        </Link>
      </div>
      <Footer />
    </div>
  );
}
