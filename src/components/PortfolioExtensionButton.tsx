"use client";

import { useState } from "react";
import { startPortfolioExtensionPurchase } from "@/app/profiel/actions";

export function PortfolioExtensionButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const { checkoutUrl } = await startPortfolioExtensionPurchase(window.location.origin);
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis.");
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded border border-vak-navy px-4 py-2 text-xs font-semibold text-vak-navy transition hover:bg-vak-navy hover:text-white disabled:opacity-60"
      >
        {loading ? "Bezig…" : "Uitbreiden · €10 / 30 dagen"}
      </button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
