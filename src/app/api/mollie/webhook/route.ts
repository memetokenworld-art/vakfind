import { NextResponse } from "next/server";
import { getMolliePayment } from "@/lib/mollie";
import { createServiceClient } from "@/lib/supabase/service";

// Mollie webhook: stuurt alleen "id=tr_xxx" als form-encoded body, GEEN
// handtekening om te verifiëren (dat is bewust — de officiële manier is
// om de betaling met dat id terug op te vragen bij Mollie zelf, nooit de
// statuswaarde uit de webhook-body te vertrouwen).
// https://docs.mollie.com/docs/webhooks
export async function POST(request: Request) {
  const form = await request.formData();
  const mollieId = form.get("id");

  if (typeof mollieId !== "string" || !mollieId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const molliePayment = await getMolliePayment(mollieId);

  if (molliePayment.status !== "paid") {
    return NextResponse.json({ status: molliePayment.status });
  }

  const localPaymentId = molliePayment.metadata?.payment_id;
  if (!localPaymentId) {
    return NextResponse.json({ error: "Missing metadata.payment_id" }, { status: 400 });
  }

  const service = createServiceClient();
  const { error } = await service.rpc("confirm_payment", {
    p_payment_id: localPaymentId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "confirmed" });
}
