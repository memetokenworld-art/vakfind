"use client";

import { useState } from "react";
import { startWalletTopUp } from "@/app/portfel/actions";
import { ALLOWED_TOPUP_AMOUNTS } from "@/lib/wallet";

export function TopUpForm() {
  const [selected, setSelected] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTopUp = async () => {
    setLoading(true);
    setError(null);
    try {
      const { checkoutUrl } = await startWalletTopUp(selected, window.location.origin);
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis.");
      setLoading(false);
    }
  };

  return (
    <div className="rounded-md border border-gray-200 p-5">
      <p className="text-sm font-semibold text-vak-navy">Portfel opwaarderen</p>
      <p className="mt-1 text-xs text-gray-500">
        Betaal veilig via iDEAL of kaart (Mollie). Het bedrag komt direct op je
        VakFind-saldo te staan.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {ALLOWED_TOPUP_AMOUNTS.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => setSelected(amount)}
            className={`rounded border px-4 py-2 text-sm font-semibold transition ${
              selected === amount
                ? "border-vak-navy bg-vak-navy text-white"
                : "border-gray-300 text-vak-navy hover:border-vak-navy"
            }`}
          >
            €{amount}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleTopUp}
        disabled={loading}
        className="mt-4 block w-full rounded bg-vak-navy px-6 py-3 text-center text-sm font-semibold text-vak-gold transition hover:bg-vak-navy-light disabled:opacity-60"
      >
        {loading ? "Bezig…" : `€${selected} opwaarderen via Mollie`}
      </button>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}
