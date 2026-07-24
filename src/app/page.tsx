import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { TrustBadges } from "@/components/TrustBadges";
import { CategoryGrid } from "@/components/CategoryGrid";
import { B2BBar } from "@/components/B2BBar";
import { Footer } from "@/components/Footer";

export default async function Home() {
  const supabase = await createClient();

  // Kategorie "liścia" (parent_id not null) — czyli konkretne zawody,
  // nie grupy nadrzędne. Dane realnie pobrane z żywej bazy Supabase.
  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, name, slug")
    .not("parent_id", "is", null)
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Kon categorieën niet ophalen uit Supabase:", error.message);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <section className="bg-vak-navy px-6 py-20 text-center text-white">
        <h1 className="mx-auto max-w-2xl text-4xl font-extrabold leading-tight md:text-5xl">
          Vind een betrouwbare vakman bij jou in de buurt
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-vak-gold-light">
          Geverifieerd KvK-nummer · Echte beoordelingen · Geen verborgen kosten
        </p>
        <div className="mt-10">
          <SearchBar />
        </div>
      </section>

      <TrustBadges />
      <CategoryGrid categories={categories ?? []} />
      <B2BBar />
      <Footer />
    </div>
  );
}
