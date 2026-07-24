"use server";

import { createClient } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/geocode";

export async function createOrder(input: {
  categoryId: string;
  description: string;
  location: string;
  preferredDate: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Niet ingelogd.");
  }

  const geo = await geocodeAddress(input.location);

  const title =
    input.description.trim().length > 60
      ? `${input.description.trim().slice(0, 60)}…`
      : input.description.trim();

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      client_id: user.id,
      category_id: input.categoryId,
      title,
      description: input.description.trim(),
      city: input.location.trim(),
      // Postcode wordt nog niet apart ingevuld in dit formulier — tijdelijk
      // dezelfde waarde als locatie, tot er een echt adresveld is.
      postal_code: input.location.trim(),
      latitude: geo?.lat ?? null,
      longitude: geo?.lng ?? null,
      preferred_date: input.preferredDate || null,
    })
    .select("id")
    .single();

  if (error || !order) {
    throw new Error(error?.message ?? "Opdracht plaatsen mislukt.");
  }

  return order;
}
