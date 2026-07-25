import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProfessionalRow } from "@/components/ProfessionalRow";

// Resultatenpagina voor een categorie — waar SearchBar (en CategoryChips)
// naartoe linken. Lijst van vakmensen met deze categorie, gesorteerd op
// VakScore, zelfde rijcomponent als "Aanbevolen in jouw buurt" op de
// homepage.
export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: category } = await supabase
    .from("categories")
    .select("id, name")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!category) {
    notFound();
  }

  const { data: links } = await supabase
    .from("professional_categories")
    .select("professional_id")
    .eq("category_id", category.id);

  const professionalIds = (links ?? []).map((l) => l.professional_id);

  const { data: proProfiles } =
    professionalIds.length > 0
      ? await supabase
          .from("professional_profiles")
          .select(
            "profile_id, vak_score, review_avg_rating, review_count, completed_orders_count"
          )
          .in("profile_id", professionalIds)
          .order("vak_score", { ascending: false })
      : { data: [] };

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
    };
  });

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-lg font-bold text-vak-navy">{category.name}</h1>

        {professionals.length === 0 ? (
          <p className="mt-8 text-sm text-gray-400">
            Nog geen vakmensen geregistreerd in deze categorie.
          </p>
        ) : (
          <div className="mt-6">
            {professionals.map((pro) => (
              <ProfessionalRow key={pro.profileId} pro={pro} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
