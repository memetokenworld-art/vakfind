"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendMessage } from "@/app/berichten/actions";

export function MessageForm({ conversationId }: { conversationId: string }) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSend = async () => {
    if (!body.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage(conversationId, body);
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Versturen mislukt.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-gray-100 pt-4">
      <div className="flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={2}
          placeholder="Typ een bericht…"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2.5 text-sm text-vak-navy outline-none placeholder:text-gray-400"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !body.trim()}
          className="shrink-0 rounded bg-vak-navy px-5 py-2.5 text-sm font-semibold text-vak-gold transition hover:bg-vak-navy-light disabled:opacity-60"
        >
          {sending ? "…" : "Versturen"}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
