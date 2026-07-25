"use server";

import { createClient } from "@/lib/supabase/server";

// Gesprek starten (of het bestaande ophalen) tussen de ingelogde gebruiker
// en `otherPartyId`. De RLS-policy "conversations_insert_if_unlocked"
// (migratie 0017) controleert zelf of er al een betaald ontgrendeld contact
// bestaat tussen deze twee — zonder ontgrendeling faalt de insert gewoon
// met een RLS-foutmelding, dat hoeft hier niet dubbel gecontroleerd.
export async function getOrCreateConversation(otherPartyId: string, orderId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Niet ingelogd.");
  }

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .single();

  if (!myProfile) {
    throw new Error("Profiel niet gevonden.");
  }

  const clientId = myProfile.account_type === "client" ? user.id : otherPartyId;
  const professionalId = myProfile.account_type === "client" ? otherPartyId : user.id;

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("client_id", clientId)
    .eq("professional_id", professionalId)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ client_id: clientId, professional_id: professionalId, order_id: orderId ?? null })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Gesprek starten mislukt.");
  }

  return created.id;
}

export async function sendMessage(conversationId: string, body: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Niet ingelogd.");
  }

  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("Bericht is leeg.");
  }

  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, body: trimmed });

  if (error) {
    throw new Error(error.message);
  }
}
