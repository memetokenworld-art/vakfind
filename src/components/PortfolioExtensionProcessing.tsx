"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { finalizePortfolioExtensionPurchase } from "@/app/profiel/actions";

type Status = "paid" | "pending" | "open" | "failed" | "canceled" | "expired";

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 15; // ~30 seconden

// Zelfde pollpatroon als TopUpProcessing (src/components/TopUpProcessing.tsx)
// — één check bij page load liet gebruikers vastzitten op "wordt verwerkt"
// als Mollie de eindstatus niet exact op tijd had.
export function PortfolioExtensionProcessing({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState<Status>("pending");
  const [error, setError] = useState<string | null>(null);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const check = async () => {
      attempts += 1;
      try {
        const result = await finalizePortfolioExtensionPurchase(orderId);
        if (cancelled) return;
        setStatus(result.status);
        if (result.status === "pending" || result.status === "open") {
          if (attempts >= MAX_ATTEMPTS) {
            setGaveUp(true);
            return;
          }
          setTimeout(check, POLL_INTERVAL_MS);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Er ging iets mis.");
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return (
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

      {(status === "pending" || status === "open") && !error && (
        <>
          <p className="text-4xl">⏳</p>
          <h1 className="mt-4 text-lg font-bold text-vak-navy">Betaling wordt verwerkt</h1>
          <p className="mt-2 text-sm text-gray-500">
            {gaveUp
              ? "Dit duurt langer dan verwacht. Je uitbreiding wordt geactiveerd zodra Mollie de betaling bevestigt — kijk zo nog eens op je profiel."
              : "Even geduld, dit wordt automatisch gecontroleerd…"}
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

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      <Link
        href="/profiel"
        className="mt-6 inline-block rounded bg-vak-navy px-6 py-3 text-sm font-semibold text-vak-gold transition hover:bg-vak-navy-light"
      >
        Naar mijn profiel
      </Link>
    </div>
  );
}
