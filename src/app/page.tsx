import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { TrustBadges } from "@/components/TrustBadges";
import { CategoryChips } from "@/components/CategoryChips";
import { ProfessionalCard } from "@/components/ProfessionalCard";
import { B2BBar } from "@/components/B2BBar";
import { Footer } from "@/components/Footer";

export default async function Home() {
  const supabase = await createClient();

  // Kategorie "liścia" (parent_id not null) — czyli konkretne zawody,
  // nie grupy nadrzędne. Dane realnie pobrane z żywej bazy Supabase.
  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, name, slug")
    .not("parent_id", "is", null)
    .eq("is_active", true)
    .order("name");

  if (categoriesError) {
    console.error(
      "Kon categorieën niet ophalen uit Supabase:",
      categoriesError.message
    );
  }

  // Najlepiej oceniani fachowcy (sekcja "Aanbevolen in jouw buurt").
  // Dwa oddzielne zapytania zamiast embedowanego JOIN-a — prostsze do
  // utrzymania i w pełni bezpieczne typowo bez generowanych typów Supabase.
  const { data: proProfiles, error: prosError } = await supabase
    .from("professional_profiles")
    .select(
      "profile_id, vak_score, review_avg_rating, review_count, completed_orders_count, bio"
    )
    .order("vak_score", { ascending: false })
    .limit(6);

  if (prosError) {
    console.error(
      "Kon aanbevolen vakmensen niet ophalen uit Supabase:",
      prosError.message
    );
  }

  const proIds = (proProfiles ?? []).map((p) => p.profile_id);
  const { data: proOwners } =
    proIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, city").in("id", proIds)
      : { data: [] };

  const professionals = (proProfiles ?? []).map((p) => {
    const owner = proOwners?.find((o) => o.id === p.profile_id);
    return {
      profileId: p.profile_id,
      fullName: owner?.full_name ?? "Onbekende vakman",
      city: owner?.city ?? null,
      vakScore: p.vak_score,
      reviewAvgRating: p.review_avg_rating,
      reviewCount: p.review_count,
      completedOrdersCount: p.completed_orders_count,
      bio: p.bio,
    };
  });

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <section className="bg-vak-navy px-6 pb-14 pt-16 text-center text-white">
        <h1 className="mx-auto max-w-2xl text-2xl font-extrabold leading-snug md:text-3xl">
          Vind een betrouwbare vakman of plaats een klus
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-gray-300">
          Geverifieerd, beoordeeld, klaar om aan de slag te gaan
        </p>
        <div className="mt-8">
          <SearchBar />
        </div>
      </section>

      <TrustBadges />
      <CategoryChips categories={categories ?? []} />

      <section className="mx-auto max-w-5xl px-6 py-10">
        <h2 className="mb-6 text-sm font-bold uppercase tracking-wide text-gray-500">
          Aanbevolen in jouw buurt
        </h2>

        {professionals.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
            Nog geen vakmensen geregistreerd in jouw regio.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
            {professionals.map((pro) => (
              <ProfessionalCard key={pro.profileId} pro={pro} />
            ))}
          </div>
        )}
      </section>

      <B2BBar />
      <Footer />
    </div>
  );
}
