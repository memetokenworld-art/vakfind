import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProfileEditForm } from "@/components/ProfileEditForm";

// "Mijn profiel" — dostęp do własnych danych po zalogowaniu, w każdej
// chwili (nie tylko raz, przy pierwszym logowaniu przez /profiel/nieuw).
export default async function MyProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, account_type, full_name, city, postal_code")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/profiel/nieuw?next=/profiel");
  }

  if (profile.account_type === "client") {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="mx-auto max-w-xl px-6 py-14">
          <h1 className="text-xl font-bold text-vak-navy">Mijn profiel</h1>
          <p className="mt-2 text-sm text-gray-500">{profile.full_name}</p>
          <p className="mt-6 text-sm text-gray-500">
            Bekijk je geplaatste opdrachten via de link in je bevestigingsmail,
            of plaats een nieuwe klus.
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  const { data: pro } = await supabase
    .from("professional_profiles")
    .select(
      "profile_id, bio, years_of_experience, has_own_tools, reads_technical_drawings, service_radius_km, hourly_rate_min, hourly_rate_max, profile_completeness, vak_score"
    )
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!pro) {
    redirect("/profiel/nieuw?next=/profiel");
  }

  const { data: allCategories } = await supabase
    .from("categories")
    .select("id, name")
    .not("parent_id", "is", null)
    .eq("is_active", true)
    .order("name");

  const { data: myCategories } = await supabase
    .from("professional_categories")
    .select("category_id")
    .eq("professional_id", user.id);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="px-6 py-14">
        <ProfileEditForm
          professionalId={pro.profile_id}
          initial={{
            city: profile.city,
            postalCode: profile.postal_code,
            bio: pro.bio,
            yearsOfExperience: pro.years_of_experience,
            hasOwnTools: pro.has_own_tools,
            readsTechnicalDrawings: pro.reads_technical_drawings,
            serviceRadiusKm: pro.service_radius_km,
            hourlyRateMin: pro.hourly_rate_min,
            hourlyRateMax: pro.hourly_rate_max,
          }}
          allCategories={allCategories ?? []}
          selectedCategoryIds={(myCategories ?? []).map((c) => c.category_id)}
          profileCompleteness={pro.profile_completeness}
          vakScore={pro.vak_score}
        />
      </div>
      <Footer />
    </div>
  );
}
