"use server";

import { createClient } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/geocode";
import { createMolliePayment, getMolliePayment } from "@/lib/mollie";
import { createServiceClient } from "@/lib/supabase/service";

const PORTFOLIO_EXTENSION_PRICE_EUR = 10;

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

// Betaalde uitbreiding portfolio (10€ / 30 dagen → 30 foto's + 10 video's,
// zie migratie 0015). Zelfde patroon als de portfel-opwaardering
// (src/app/portfel/actions.ts): pending bestelling aanmaken, Mollie-betaling
// aanmaken, na terugkeer of via de webhook bevestigen met de service-role
// client (confirm_portfolio_extension_order is bewust niet uitvoerbaar door
// gewone gebruikers, zie migratie 0015).
export async function startPortfolioExtensionPurchase(origin: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Niet ingelogd.");
  }

  const { data: order, error: insertError } = await supabase
    .from("portfolio_extension_orders")
    .insert({ professional_id: user.id, price: PORTFOLIO_EXTENSION_PRICE_EUR })
    .select("id")
    .single();

  if (insertError || !order) {
    throw new Error(insertError?.message ?? "Bestelling aanmaken mislukt.");
  }

  const molliePayment = await createMolliePayment({
    amountEur: PORTFOLIO_EXTENSION_PRICE_EUR,
    description: "VakFind portfolio-uitbreiding (30 dagen)",
    redirectUrl: `${origin}/profiel/portfolio-uitbreiding/verwerken?order_id=${order.id}`,
    webhookUrl: `${origin}/api/mollie/webhook`,
    metadata: { kind: "portfolio_extension", order_id: order.id },
  });

  const { error: updateError } = await supabase
    .from("portfolio_extension_orders")
    .update({ provider_payment_id: molliePayment.id })
    .eq("id", order.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const checkoutUrl = molliePayment._links.checkout?.href;
  if (!checkoutUrl) {
    throw new Error("Mollie gaf geen betaallink terug.");
  }

  return { checkoutUrl };
}

export async function finalizePortfolioExtensionPurchase(orderId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Niet ingelogd.");
  }

  const { data: order } = await supabase
    .from("portfolio_extension_orders")
    .select("id, provider_payment_id, status, professional_id")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.professional_id !== user.id) {
    throw new Error("Bestelling niet gevonden.");
  }

  if (order.status === "paid") {
    return { status: "paid" as const };
  }

  if (order.status === "failed") {
    return { status: "failed" as const };
  }

  if (!order.provider_payment_id) {
    return { status: "pending" as const };
  }

  const molliePayment = await getMolliePayment(order.provider_payment_id);
  const service = createServiceClient();

  if (molliePayment.status === "paid") {
    const { error } = await service.rpc("confirm_portfolio_extension_order", {
      p_order_id: order.id,
    });
    if (error) throw new Error(error.message);
    return { status: "paid" as const };
  }

  if (["failed", "canceled", "expired"].includes(molliePayment.status)) {
    const { error } = await service.rpc("mark_portfolio_extension_order_failed", {
      p_order_id: order.id,
    });
    if (error) throw new Error(error.message);
  }

  return { status: molliePayment.status };
}
