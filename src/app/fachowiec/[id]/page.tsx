import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { UnlockContactButton } from "@/components/UnlockContactButton";
import { MessageButton } from "@/components/MessageButton";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Profil fachowca (ekran 2) — VakScore, opinie, portfolio, przycisk
// odblokowania kontaktu. Zbudowany 1:1 wg zatwierdzonego wireframe'u
// (bez kart/cieni, pełnoszerokościowa belka CTA na dole).
export default async function ProfessionalProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: pro } = await supabase
    .from("professional_profiles")
    .select(
      "profile_id, bio, vak_score, review_avg_rating, review_count, completed_orders_count, service_radius_km, created_at, custom_profession"
    )
    .eq("profile_id", id)
    .maybeSingle();

  if (!pro) {
    notFound();
  }

  const { data: owner } = await supabase
    .from("profiles")
    .select("full_name, city")
    .eq("id", id)
    .single();

  const { data: proCategories } = await supabase
    .from("professional_categories")
    .select("category_id")
    .eq("professional_id", id);

  const categoryIds = (proCategories ?? []).map((c) => c.category_id);
  const { data: categories } =
    categoryIds.length > 0
      ? await supabase.from("categories").select("id, name").in("id", categoryIds)
      : { data: [] };

  const { data: photos } = await supabase
    .from("professional_portfolio_photos")
    .select("id, photo_url, caption")
    .eq("professional_id", id)
    .eq("moderation_status", "approved")
    .order("created_at", { ascending: false });

  const { data: videos } = await supabase
    .from("professional_portfolio_videos")
    .select("id, video_url, caption")
    .eq("professional_id", id)
    .eq("moderation_status", "approved")
    .order("created_at", { ascending: false });

  const memberSince = new Date(pro.created_at).getFullYear();
  const fullName = owner?.full_name ?? "Onbekende vakman";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isUnlocked = false;
  if (user) {
    const { data: unlock } = await supabase
      .from("professional_contact_unlocks")
      .select("id")
      .eq("client_id", user.id)
      .eq("professional_id", id)
      .maybeSingle();
    isUnlocked = Boolean(unlock);
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-vak-navy text-lg font-bold text-vak-gold">
              {initials(fullName)}
            </div>
            <div>
              <p className="text-lg font-bold text-vak-navy">{fullName}</p>
              <p className="text-sm text-gray-500">
                {owner?.city ?? "Onbekende locatie"}
                {pro.service_radius_km
                  ? ` · werkt in een straal van ${pro.service_radius_km} km`
                  : ""}
              </p>
              <p className="text-sm text-gray-500">
                Op VakFind sinds {memberSince} · {pro.completed_orders_count}{" "}
                voltooide opdrachten
              </p>
            </div>
          </div>
          <div className="shrink-0 text-center">
            <div className="rounded bg-vak-amber-bg px-3 py-1.5 text-lg font-bold text-vak-amber-text">
              {Math.round(pro.vak_score)}
            </div>
            <p className="mt-1 text-xs text-gray-400">VakScore</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-6 border-t border-gray-100 pt-6">
          <div>
            <p className="text-sm font-semibold text-vak-navy">
              Klantbeoordeling
            </p>
            <p className="mt-1 text-xl font-bold text-vak-navy">
              {pro.review_count > 0 ? (
                <>
                  {pro.review_avg_rating.toFixed(1)}{" "}
                  <span className="text-sm font-normal text-gray-400">
                    ({pro.review_count} beoordelingen)
                  </span>
                </>
              ) : (
                <span className="text-sm font-normal text-gray-400">
                  Nog geen beoordelingen
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-vak-navy">
              Voltooide opdrachten
            </p>
            <p className="mt-1 text-xl font-bold text-vak-navy">
              {pro.completed_orders_count}
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-100 pt-6">
          <h2 className="text-sm font-semibold text-vak-navy">
            Over het bedrijf
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {pro.bio ?? "Nog geen bedrijfsomschrijving toegevoegd."}
          </p>
        </div>

        {((categories && categories.length > 0) || pro.custom_profession) && (
          <div className="mt-8 border-t border-gray-100 pt-6">
            <h2 className="text-sm font-semibold text-vak-navy">Diensten</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(categories ?? []).map((c) => (
                <span
                  key={c.id}
                  className="rounded bg-gray-50 px-3 py-1.5 text-sm text-vak-navy"
                >
                  {c.name}
                </span>
              ))}
              {pro.custom_profession && (
                <span className="rounded bg-gray-50 px-3 py-1.5 text-sm text-vak-navy">
                  {pro.custom_profession}
                </span>
              )}
            </div>
          </div>
        )}

        {photos && photos.length > 0 && (
          <div className="mt-8 border-t border-gray-100 pt-6">
            <h2 className="text-sm font-semibold text-vak-navy">
              Realisaties
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={photo.id}
                  src={photo.photo_url}
                  alt={photo.caption ?? ""}
                  className="aspect-square w-full rounded object-cover"
                />
              ))}
            </div>
          </div>
        )}

        {videos && videos.length > 0 && (
          <div className="mt-8 border-t border-gray-100 pt-6">
            <h2 className="text-sm font-semibold text-vak-navy">Video&apos;s</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {videos.map((video) => (
                <video
                  key={video.id}
                  src={video.video_url}
                  controls
                  className="aspect-square w-full rounded object-cover"
                />
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 space-y-3">
          <UnlockContactButton professionalId={pro.profile_id} />
          {isUnlocked && <MessageButton otherPartyId={pro.profile_id} />}
        </div>
      </div>

      <Footer />
    </div>
  );
}
