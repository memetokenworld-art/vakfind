"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FullWidthCtaButton } from "@/components/FullWidthCta";

// Krok "dokończ profil" po pierwszym logowaniu przez Google — bez tego
// żaden wiersz w profiles/profile_contacts by nie istniał, a od niego
// zależy wszystko dalej (zlecenia, odblokowania kontaktu). Minimalne
// obowiązkowe dane fachowca zgodnie ze specyfikacją (pkt 7d): KvK, imię i
// nazwisko, email — email bierzemy wprost z konta Google.
export function ProfileSetupForm() {
  const [role, setRole] = useState<"client" | "professional" | null>(null);
  const [fullName, setFullName] = useState("");
  const [kvkNumber, setKvkNumber] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/");
        return;
      }

      setEmail(user.email ?? null);
      const metaName =
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        "";
      setFullName(metaName);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (!role || !fullName.trim() || !email) return;
    if (role === "professional" && !kvkNumber.trim()) return;

    setSubmitting(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Je bent niet ingelogd.");
      setSubmitting(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .insert({ id: user.id, account_type: role, full_name: fullName.trim() });

    if (profileError) {
      setError(profileError.message);
      setSubmitting(false);
      return;
    }

    const { error: contactError } = await supabase
      .from("profile_contacts")
      .insert({ profile_id: user.id, email });

    if (contactError) {
      setError(contactError.message);
      setSubmitting(false);
      return;
    }

    if (role === "professional") {
      const { error: proError } = await supabase
        .from("professional_profiles")
        .insert({ profile_id: user.id, kvk_number: kvkNumber.trim() });

      if (proError) {
        setError(proError.message);
        setSubmitting(false);
        return;
      }
    }

    const next = searchParams.get("next") ?? "/";
    router.replace(next);
    router.refresh();
  };

  if (!email) {
    return <p className="text-sm text-gray-400">Laden…</p>;
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-xl font-bold text-vak-navy">Rond je profiel af</h1>
      <p className="mt-1 text-sm text-gray-500">
        Nog een paar gegevens, dan kun je direct verder op VakFind.
      </p>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => setRole("client")}
          className={
            role === "client"
              ? "flex-1 rounded bg-vak-navy px-4 py-3 text-sm font-semibold text-vak-gold"
              : "flex-1 rounded border border-gray-300 px-4 py-3 text-sm font-medium text-vak-navy"
          }
        >
          Ik ben klant
        </button>
        <button
          type="button"
          onClick={() => setRole("professional")}
          className={
            role === "professional"
              ? "flex-1 rounded bg-vak-navy px-4 py-3 text-sm font-semibold text-vak-gold"
              : "flex-1 rounded border border-gray-300 px-4 py-3 text-sm font-medium text-vak-navy"
          }
        >
          Ik ben vakman
        </button>
      </div>

      {role && (
        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-vak-navy">
              Naam
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-vak-navy outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-vak-navy">
              E-mail
            </label>
            <input
              type="text"
              value={email}
              disabled
              className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500"
            />
          </div>

          {role === "professional" && (
            <div>
              <label className="text-sm font-semibold text-vak-navy">
                KvK-nummer
              </label>
              <input
                type="text"
                value={kvkNumber}
                onChange={(e) => setKvkNumber(e.target.value)}
                placeholder="bijv. 12345678"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-vak-navy outline-none placeholder:text-gray-400"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <FullWidthCtaButton onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Bezig…" : "Doorgaan"}
          </FullWidthCtaButton>
        </div>
      )}
    </div>
  );
}
