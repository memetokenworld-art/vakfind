"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Contact = { phone: string | null; email: string };

// "Odblokuj kontakt · 1€" (ekran 2) — RLS na profile_contacts (KROK 10
// migracji) sam decyduje, czy dany użytkownik już ma dostęp do numeru/maila
// (właściciel albo ktoś z opłaconym odblokowaniem), więc wystarczy spróbować
// je odczytać: jeśli baza coś zwróci, kontakt jest już odblokowany.
export function UnlockContactButton({
  professionalId,
}: {
  professionalId: string;
}) {
  const [status, setStatus] = useState<
    "checking" | "locked" | "loading" | "unlocked" | "error" | "signed_out"
  >("checking");
  const [contact, setContact] = useState<Contact | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setStatus("signed_out");
        return;
      }

      const { data } = await supabase
        .from("profile_contacts")
        .select("phone, email")
        .eq("profile_id", professionalId)
        .maybeSingle();

      if (cancelled) return;

      if (data) {
        setContact(data);
        setStatus("unlocked");
      } else {
        setStatus("locked");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professionalId]);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/fachowiec/${professionalId}`,
      },
    });
  };

  const handleUnlock = async () => {
    setStatus("loading");
    setErrorMessage(null);

    const { error: unlockError } = await supabase.rpc(
      "unlock_professional_contact",
      { p_professional_id: professionalId }
    );

    if (unlockError) {
      setStatus("error");
      setErrorMessage(unlockError.message);
      return;
    }

    const { data } = await supabase
      .from("profile_contacts")
      .select("phone, email")
      .eq("profile_id", professionalId)
      .maybeSingle();

    if (data) {
      setContact(data);
      setStatus("unlocked");
    } else {
      setStatus("error");
      setErrorMessage("Ontgrendeld, maar contactgegevens konden niet worden geladen.");
    }
  };

  if (status === "checking") {
    return (
      <div className="w-full bg-gray-100 px-6 py-3.5 text-center text-sm text-gray-400">
        Laden…
      </div>
    );
  }

  if (status === "unlocked" && contact) {
    return (
      <div className="w-full bg-vak-success-bg px-6 py-3.5 text-center text-sm font-semibold text-vak-success-text">
        {contact.phone ? `${contact.phone} · ` : ""}
        {contact.email}
      </div>
    );
  }

  if (status === "signed_out") {
    return (
      <button
        type="button"
        onClick={handleLogin}
        className="block w-full bg-vak-navy px-6 py-3.5 text-center text-sm font-semibold text-vak-gold transition hover:bg-vak-navy-light"
      >
        Log in om contact te ontgrendelen · 1€
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleUnlock}
        disabled={status === "loading"}
        className="block w-full bg-vak-navy px-6 py-3.5 text-center text-sm font-semibold text-vak-gold transition hover:bg-vak-navy-light disabled:opacity-60"
      >
        {status === "loading" ? "Bezig…" : "🔒 Contact ontgrendelen · 1€"}
      </button>
      {status === "error" && errorMessage && (
        <p className="mt-2 text-center text-xs text-red-500">{errorMessage}</p>
      )}
    </div>
  );
}
