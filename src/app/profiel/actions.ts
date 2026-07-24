"use server";

import { createClient } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/geocode";

// Server Action: jedyne miejsce, gdzie łączymy "zapisz miasto" z
// "zamień je na współrzędne" — musi działać po stronie serwera, bo klucz
// Google Geocoding API jest tajny (nie może trafić do przeglądarki).
export async function updateProfileLocation(city: string, postalCode: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Niet ingelogd.");
  }

  const trimmedCity = city.trim();
  const trimmedPostal = postalCode.trim();

  let latitude: number | null = null;
  let longitude: number | null = null;

  if (trimmedCity) {
    const geo = await geocodeAddress(
      [trimmedPostal, trimmedCity].filter(Boolean).join(" ")
    );
    if (geo) {
      latitude = geo.lat;
      longitude = geo.lng;
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      city: trimmedCity || null,
      postal_code: trimmedPostal || null,
      latitude,
      longitude,
    })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  return { latitude, longitude };
}
