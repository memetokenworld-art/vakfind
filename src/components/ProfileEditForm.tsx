"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FullWidthCtaButton } from "@/components/FullWidthCta";
import { updateProfileLocation } from "@/app/profiel/actions";

type Category = { id: string; name: string };

type Props = {
  professionalId: string;
  initial: {
    city: string | null;
    postalCode: string | null;
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

// Rząd checklisty (ekran 8): zielone tło + haczyk gdy element jest
// uzupełniony, bursztynowe + przerywane kółko gdy brakuje — dokładnie wg
// ustaleń o mechanizmie liczenia % kompletności (deterministyczne "czy
// pole jest wypełnione: tak/nie", bez oceny jakości treści).
function ChecklistItem({
  done,
  label,
  children,
}: {
  done: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-md px-4 py-3 ${
        done ? "bg-vak-success-bg" : "bg-vak-amber-bg"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
            done
              ? "bg-vak-success-text text-white"
              : "border border-dashed border-vak-amber-text"
          }`}
        >
          {done ? "✓" : ""}
        </span>
        <span
          className={`text-sm font-semibold ${
            done ? "text-vak-success-text" : "text-vak-amber-text"
          }`}
        >
          {label}
        </span>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

// Edycja profilu fachowca (ekran 8 — "Uzupełnij profil"). Checklista +
// pola scalone w jedno: kolor rzędu przelicza się na żywo w przeglądarce
// (dla natychmiastowej informacji zwrotnej), a prawdziwy % na pasku na
// górze pochodzi z bazy (calculate_profile_completeness) i uaktualnia się
// po zapisie — te dwa mechanizmy celowo używają tej samej logiki wag.
export function ProfileEditForm({
  professionalId,
  initial,
  allCategories,
  selectedCategoryIds,
  profileCompleteness,
  vakScore,
}: Props) {
  const [city, setCity] = useState(initial.city ?? "");
  const [postalCode, setPostalCode] = useState(initial.postalCode ?? "");
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

    try {
      await updateProfileLocation(city, postalCode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Locatie opslaan mislukt.");
      setSubmitting(false);
      return;
    }

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
          className="h-2 rounded-full bg-vak-gold transition-all"
          style={{ width: `${profileCompleteness}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-gray-400">VakScore: {Math.round(vakScore)}</p>
      <p className="mt-4 text-xs text-gray-500">
        Hoe meer je aanvult, hoe hoger je VakScore — klanten kiezen vaker
        profielen met een hoge score.
      </p>

      <div className="mt-6 space-y-3">
        <div className="rounded-md bg-vak-success-bg px-4 py-3 text-sm font-semibold text-vak-success-text">
          ✓ KvK-nummer, naam en e-mail — verplicht
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-vak-navy">
              Plaats
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Tilburg"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-vak-navy outline-none placeholder:text-gray-400"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-vak-navy">
              Postcode
            </label>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="5041 AB"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-vak-navy outline-none placeholder:text-gray-400"
            />
          </div>
        </div>
        <p className="rounded-md bg-gray-50 px-4 py-3 text-xs text-gray-500">
          Plaats/postcode worden omgezet naar coördinaten (Google Geocoding)
          zodra je opslaat. Het filteren van opdrachten op deze werkstraal
          gebruikt die coördinaten nog niet overal — dat volgt in een
          volgende stap.
        </p>

        <ChecklistItem done={bio.trim().length > 20} label="Bedrijfsomschrijving">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Vertel kort wie je bent en wat je doet (minimaal enkele zinnen)."
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-vak-navy outline-none placeholder:text-gray-400"
          />
        </ChecklistItem>

        <ChecklistItem done={years.trim() !== ""} label="Jaren ervaring">
          <input
            type="number"
            min={0}
            value={years}
            onChange={(e) => setYears(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-vak-navy outline-none"
          />
        </ChecklistItem>

        <ChecklistItem done={hasOwnTools} label="Eigen gereedschap">
          <label className="flex items-center gap-2 text-sm text-vak-navy">
            <input
              type="checkbox"
              checked={hasOwnTools}
              onChange={(e) => setHasOwnTools(e.target.checked)}
            />
            Ik heb mijn eigen gereedschap
          </label>
        </ChecklistItem>

        <ChecklistItem done={readsDrawings} label="Technische tekeningen">
          <label className="flex items-center gap-2 text-sm text-vak-navy">
            <input
              type="checkbox"
              checked={readsDrawings}
              onChange={(e) => setReadsDrawings(e.target.checked)}
            />
            Ik kan technische tekeningen lezen
          </label>
        </ChecklistItem>

        <ChecklistItem done={false} label="Certificaten (bijv. VCA)">
          <p className="text-xs text-vak-amber-text">
            Toevoegen komt binnenkort beschikbaar.
          </p>
        </ChecklistItem>

        <ChecklistItem done={false} label="Foto's van je werk (0/3)">
          <p className="text-xs text-vak-amber-text">
            Toevoegen komt binnenkort beschikbaar.
          </p>
        </ChecklistItem>

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
