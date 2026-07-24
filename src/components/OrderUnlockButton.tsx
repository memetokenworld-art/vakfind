"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// "Odblokuj kontakt · 5€" (ekran 6). Po sukcesie odświeżamy stronę —
// unlock_order_contact() sam przełącza zlecenie na "W realizacji" po
// stronie bazy, więc odświeżenie pokaże aktualny stan wszystkim.
export function OrderUnlockButton({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleClick = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/opdrachten`,
        },
      });
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    const { error } = await supabase.rpc("unlock_order_contact", {
      p_order_id: orderId,
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    router.refresh();
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "loading"}
        className="shrink-0 rounded bg-vak-navy px-5 py-2.5 text-sm font-semibold text-vak-gold transition hover:bg-vak-navy-light disabled:opacity-60"
      >
        {status === "loading" ? "Bezig…" : "Contact ontgrendelen · 5€"}
      </button>
      {status === "error" && errorMessage && (
        <p className="mt-1 max-w-[200px] text-xs text-red-500">{errorMessage}</p>
      )}
    </div>
  );
}
