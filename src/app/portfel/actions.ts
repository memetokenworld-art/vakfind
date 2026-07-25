"use server";

import { createClient } from "@/lib/supabase/server";
import { createMolliePayment, getMolliePayment } from "@/lib/mollie";
import { createServiceClient } from "@/lib/supabase/service";
import { ALLOWED_TOPUP_AMOUNTS } from "@/lib/wallet";

export async function startWalletTopUp(amountEur: number, origin: string) {
  if (!(ALLOWED_TOPUP_AMOUNTS as readonly number[]).includes(amountEur)) {
    throw new Error("Ongeldig bedrag.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Niet ingelogd.");
  }

  const { data: payment, error: insertError } = await supabase
    .from("payments")
    .insert({
      profile_id: user.id,
      amount: amountEur,
      purpose: "wallet_topup",
    })
    .select("id")
    .single();

  if (insertError || !payment) {
    throw new Error(insertError?.message ?? "Betaling aanmaken mislukt.");
  }

  const molliePayment = await createMolliePayment({
    amountEur,
    description: `VakFind portfel doładowanie €${amountEur}`,
    redirectUrl: `${origin}/portfel/verwerken?payment_id=${payment.id}`,
    webhookUrl: `${origin}/api/mollie/webhook`,
    metadata: { kind: "wallet_topup", payment_id: payment.id },
  });

  const { error: updateError } = await supabase
    .from("payments")
    .update({ provider_payment_id: molliePayment.id })
    .eq("id", payment.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const checkoutUrl = molliePayment._links.checkout?.href;
  if (!checkoutUrl) {
    throw new Error("Mollie gaf geen betaallink terug.");
  }

  return { checkoutUrl };
}

// Wordt aangeroepen vanaf de terugkeerpagina (/portfel/verwerken) — Mollie
// stuurt de gebruiker daar meteen na het afronden van de checkout naartoe,
// vaak vóórdat de asynchrone webhook is aangekomen. Door hier ook meteen te
// controleren/bevestigen ziet de gebruiker zijn nieuwe saldo zonder te
// hoeven wachten — de webhook (KROK zie route.ts) blijft de betrouwbare
// vangnet-bevestiging voor als iemand het tabblad eerder sluit.
export async function finalizeWalletTopUp(localPaymentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Niet ingelogd.");
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("id, provider_payment_id, status, profile_id")
    .eq("id", localPaymentId)
    .maybeSingle();

  if (!payment || payment.profile_id !== user.id) {
    throw new Error("Betaling niet gevonden.");
  }

  if (payment.status === "paid") {
    return { status: "paid" as const };
  }

  if (!payment.provider_payment_id) {
    return { status: "pending" as const };
  }

  const molliePayment = await getMolliePayment(payment.provider_payment_id);

  if (molliePayment.status === "paid") {
    const service = createServiceClient();
    const { error } = await service.rpc("confirm_payment", {
      p_payment_id: payment.id,
    });
    if (error) throw new Error(error.message);
    return { status: "paid" as const };
  }

  return { status: molliePayment.status };
}
