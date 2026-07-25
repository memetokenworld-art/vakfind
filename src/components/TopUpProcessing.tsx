"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { finalizeWalletTopUp } from "@/app/portfel/actions";

type Status = "paid" | "pending" | "open" | "failed" | "canceled" | "expired";

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 15; // ~30 seconden

// Client component, want dit moet blijven pollen: Mollie's testomgeving
// (en soms ook echte betalingen) hebben de eindstatus niet altijd al
// klaarstaan op het exacte moment van de redirect terug naar VakFind. Eén
// server-side check bij page load (de oude aanpak) liet de gebruiker dan
// vastzitten op "wordt verwerkt", ook als de betaling allang was gelukt of
// mislukt — het saldo klopte wel (via de webhook), maar dit scherm wist dat
// niet totdat iemand zelf terugging naar /portfel.
export function TopUpProcessing({ paymentId }: { paymentId: string }) {
  const [status, setStatus] = useState<Status>("pending");
  const [error, setError] = useState<string | null>(null);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const check = async () => {
      attempts += 1;
      try {
        const result = await finalizeWalletTopUp(paymentId);
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
  }, [paymentId]);

  return (
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

      {(status === "pending" || status === "open") && !error && (
        <>
          <p className="text-4xl">⏳</p>
          <h1 className="mt-4 text-lg font-bold text-vak-navy">Betaling wordt verwerkt</h1>
          <p className="mt-2 text-sm text-gray-500">
            {gaveUp
              ? "Dit duurt langer dan verwacht. Je saldo wordt bijgewerkt zodra Mollie de betaling bevestigt — kijk zo nog eens in je portfel."
              : "Even geduld, dit wordt automatisch gecontroleerd…"}
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

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      <Link
        href="/portfel"
        className="mt-6 inline-block rounded bg-vak-navy px-6 py-3 text-sm font-semibold text-vak-gold transition hover:bg-vak-navy-light"
      >
        Naar mijn portfel
      </Link>
    </div>
  );
}
