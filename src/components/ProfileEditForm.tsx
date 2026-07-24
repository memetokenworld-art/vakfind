"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FullWidthCtaButton } from "@/components/FullWidthCta";

type Category = { id: string; name: string };

type Props = {
  professionalId: string;
  initial: {
    bio: string | null;
    yearsOfExperience: number | null;
    hasOwnTools: boolean;
    readsTechnicalDrawings: boolean;
    serviceRadiusKm: number;
    hourlyRateMin: number | null;
    hourlyRateMax: number | null;
  };
  allCategories: Category[];
  selectedCategoryIds: string[];
  profileCompleteness: number;
  vakScore: number;
};

// Edycja profilu fachowca (ekran 8 — "Uzupełnij profil"). Uproszczone
// względem mockupu: jeden formularz zamiast osobnych przycisków "Dodaj"
// per pole — zdjęcia/certyfikaty na razie pominięte (wymagają Supabase
// Storage, którego jeszcze nie skonfigurowaliśmy). Pasek postępu i
// VakScore przeliczają się same w bazie po zapisie (triggery z KROKU 3/8
// migracji), więc odświeżamy stronę po sukcesie, żeby pokazać nową wartość.
export function ProfileEditForm({
  professionalId,
  initial,
  allCategories,
  selectedCategoryIds,
  profileCompleteness,
  vakScore,
}: Props) {
  const [bio, setBio] = useState(initial.bio ?? "");
  const [years, setYears] = useState(initial.yearsOfExperience?.toString() ?? "");
  const [hasOwnTools, setHasOwnTools] = useState(initial.hasOwnTools);
  const [readsDrawings, setReadsDrawings] = useState(
    initial.readsTechnicalDrawings
  );
  const [radius, setRadius] = useState(initial.serviceRadiusKm.toString());
  const [rateMin, setRateMin] = useState(initial.hourlyRateMin?.toString() ?? "");
  const [rateMax, setRateMax] = useState(initial.hourlyRateMax?.toString() ?? "");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(selectedCategoryIds)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSubmitting(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("professional_profiles")
      .update({
        bio: bio.trim() || null,
        years_of_experience: years ? Number(years) : null,
        has_own_tools: hasOwnTools,
        reads_technical_drawings: readsDrawings,
        service_radius_km: radius ? Number(radius) : 10,
        hourly_rate_min: rateMin ? Number(rateMin) : null,
        hourly_rate_max: rateMax ? Number(rateMax) : null,
      })
      .eq("profile_id", professionalId);

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    const toAdd = [...selectedCategories].filter(
      (id) => !selectedCategoryIds.includes(id)
    );
    const toRemove = selectedCategoryIds.filter(
      (id) => !selectedCategories.has(id)
    );

    if (toAdd.length > 0) {
      await supabase
        .from("professional_categories")
        .insert(toAdd.map((category_id) => ({ professional_id: professionalId, category_id })));
    }
    if (toRemove.length > 0) {
      await supabase
        .from("professional_categories")
        .delete()
        .eq("professional_id", professionalId)
        .in("category_id", toRemove);
    }

    setSubmitting(false);
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-vak-navy">Vul je profiel aan</h1>
        <span className="text-sm font-semibold text-vak-navy">
          {profileCompleteness}%
        </span>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
        <div
          className="h-2 rounded-full bg-vak-gold"
          style={{ width: `${profileCompleteness}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-gray-400">VakScore: {Math.round(vakScore)}</p>

      <div className="mt-8 space-y-5">
        <div>
          <label className="text-sm font-semibold text-vak-navy">
            Bedrijfsomschrijving
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Vertel kort wie je bent en wat je doet."
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-vak-navy outline-none placeholder:text-gray-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-vak-navy">
              Jaren ervaring
            </label>
            <input
              type="number"
              min={0}
              value={years}
              onChange={(e) => setYears(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-vak-navy outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-vak-navy">
              Werkstraal (km)
            </label>
            <input
              type="number"
              min={1}
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-vak-navy outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-vak-navy">
              Uurtarief min (€)
            </label>
            <input
              type="number"
              min={0}
              value={rateMin}
              onChange={(e) => setRateMin(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-vak-navy outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-vak-navy">
              Uurtarief max (€)
            </label>
            <input
              type="number"
              min={0}
              value={rateMax}
              onChange={(e) => setRateMax(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-vak-navy outline-none"
            />
          </div>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-vak-navy">
            <input
              type="checkbox"
              checked={hasOwnTools}
              onChange={(e) => setHasOwnTools(e.target.checked)}
            />
            Eigen gereedschap
          </label>
          <label className="flex items-center gap-2 text-sm text-vak-navy">
            <input
              type="checkbox"
              checked={readsDrawings}
              onChange={(e) => setReadsDrawings(e.target.checked)}
            />
            Leest technische tekeningen
          </label>
        </div>

        <div>
          <label className="text-sm font-semibold text-vak-navy">
            Diensten
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {allCategories.map((c) => {
              const active = selectedCategories.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCategory(c.id)}
                  className={
                    active
                      ? "rounded px-3 py-1.5 text-sm font-semibold bg-vak-navy text-vak-gold"
                      : "rounded border border-gray-300 px-3 py-1.5 text-sm text-vak-navy"
                  }
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        <p className="rounded-md bg-gray-50 px-4 py-3 text-xs text-gray-500">
          Foto&apos;s van je werk en certificaten toevoegen komt binnenkort
          beschikbaar.
        </p>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      <div className="mt-6">
        <FullWidthCtaButton onClick={handleSave} disabled={submitting}>
          {submitting ? "Bezig…" : "Opslaan"}
        </FullWidthCtaButton>
      </div>
    </div>
  );
}
