"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateConversation } from "@/app/berichten/actions";

export function MessageButton({
  otherPartyId,
  orderId,
}: {
  otherPartyId: string;
  orderId?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const conversationId = await getOrCreateConversation(otherPartyId, orderId);
      router.push(`/berichten/${conversationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gesprek starten mislukt.");
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded border border-vak-navy px-4 py-2 text-sm font-semibold text-vak-navy transition hover:bg-vak-navy hover:text-white disabled:opacity-60"
      >
        {loading ? "Bezig…" : "💬 Bericht sturen"}
      </button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
