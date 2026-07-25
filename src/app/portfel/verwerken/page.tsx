import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { finalizeWalletTopUp } from "@/app/portfel/actions";

// Landingspagina direct na terugkeer van Mollie checkout (redirectUrl).
// Bevestigt de betaling meteen als dat kan (zie actions.ts) — de webhook
// blijft de betrouwbare vangnet-bevestiging op de achtergrond.
export default async function TopUpProcessingPage({
  searchParams,
}: {
  searchParams: Promise<{ payment_id?: string }>;
}) {
  const { payment_id: paymentId } = await searchParams;

  if (!paymentId) {
    redirect("/portfel");
  }

  let status: "paid" | "pending" | "open" | "failed" | "canceled" | "expired" = "pending";
  let errorMessage: string | null = null;

  try {
    const result = await finalizeWalletTopUp(paymentId);
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
            <h1 className="mt-4 text-lg font-bold text-vak-navy">Betaling gelukt</h1>
            <p className="mt-2 text-sm text-gray-500">
              Je portfel is opgewaardeerd. Je nieuwe saldo staat klaar.
            </p>
          </>
        )}

        {(status === "pending" || status === "open") && !errorMessage && (
          <>
            <p className="text-4xl">⏳</p>
            <h1 className="mt-4 text-lg font-bold text-vak-navy">Betaling wordt verwerkt</h1>
            <p className="mt-2 text-sm text-gray-500">
              Dit kan even duren. Ververs deze pagina zo nodig, of ga terug naar
              je portfel.
            </p>
          </>
        )}

        {(status === "failed" || status === "canceled" || status === "expired") && (
          <>
            <p className="text-4xl">✕</p>
            <h1 className="mt-4 text-lg font-bold text-vak-navy">Betaling niet gelukt</h1>
            <p className="mt-2 text-sm text-gray-500">
              De betaling is niet afgerond. Er is niets van je saldo afgeschreven.
            </p>
          </>
        )}

        {errorMessage && <p className="mt-2 text-xs text-red-500">{errorMessage}</p>}

        <Link
          href="/portfel"
          className="mt-6 inline-block rounded bg-vak-navy px-6 py-3 text-sm font-semibold text-vak-gold transition hover:bg-vak-navy-light"
        >
          Naar mijn portfel
        </Link>
      </div>
      <Footer />
    </div>
  );
}
