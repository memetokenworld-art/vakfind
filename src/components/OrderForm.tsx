"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FullWidthCtaButton } from "@/components/FullWidthCta";

type Category = { id: string; name: string };

// Formularz dodawania zlecenia (ekran 3) — bez osobnego pola "tytuł" (zgodnie
// z mockupem): tytuł wyprowadzany automatycznie z pierwszych znaków opisu.
// "Termin" jako prawdziwa data zamiast swobodnego tekstu z mockupu — łatwiej
// dalej sortować/automatyzować (zasada AI Managera, punkt 0/9 specyfikacji).
export function OrderForm({ categories }: { categories: Category[] }) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async () => {
    if (!categoryId || !description.trim() || !location.trim()) {
      setError("Vul minimaal categorie, beschrijving en locatie in.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/?login_error=not_signed_in`);
      return;
    }

    const title =
      description.trim().length > 60
        ? `${description.trim().slice(0, 60)}…`
        : description.trim();

    const { data: order, error: insertError } = await supabase
      .from("orders")
      .insert({
        client_id: user.id,
        category_id: categoryId,
        title,
        description: description.trim(),
        city: location.trim(),
        // Postcode wordt nog niet apart ingevuld in dit formulier — tijdelijk
        // dezelfde waarde als locatie, tot er een echt adresveld met
        // geocoding is (specificatie, punt 12).
        postal_code: location.trim(),
        preferred_date: preferredDate || null,
      })
      .select("id")
      .single();

    if (insertError || !order) {
      setError(insertError?.message ?? "Er ging iets mis.");
      setSubmitting(false);
      return;
    }

    router.push(`/mijn-opdrachten/${order.id}`);
  };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-xl font-bold text-vak-navy">Beschrijf je klus</h1>
      <p className="mt-1 text-sm text-gray-500">
        Hoe meer details, hoe beter de match met vakmensen.
      </p>

      <div className="mt-6">
        <label className="text-sm font-semibold text-vak-navy">
          Categorie
        </label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-vak-navy outline-none"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <label className="text-sm font-semibold text-vak-navy">
          Beschrijving
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="bijv. Ik zoek een bedrijf voor het plaatsen van een schutting, ca. 30 meter, hout."
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-vak-navy outline-none placeholder:text-gray-400"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-vak-navy">
            Locatie
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Tilburg"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-vak-navy outline-none placeholder:text-gray-400"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-vak-navy">
            Wanneer
          </label>
          <input
            type="date"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-vak-navy outline-none"
          />
        </div>
      </div>

      <p className="mt-6 text-sm text-vak-blue-alt-text">
        Je opdracht gaat naar gematchte vakmensen in jouw regio. Je betaalt
        pas als je besluit het contact met een gekozen vakman te ontgrendelen.
      </p>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      <div className="mt-6">
        <FullWidthCtaButton onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Bezig…" : "Opdracht plaatsen"}
        </FullWidthCtaButton>
      </div>
    </div>
  );
}
