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

  const service = createServiceClient();
  const kind = molliePayment.metadata?.kind ?? "wallet_topup";

  if (kind === "portfolio_extension") {
    const orderId = molliePayment.metadata?.order_id;
    if (!orderId) {
      return NextResponse.json({ error: "Missing metadata.order_id" }, { status: 400 });
    }
    const { error } = await service.rpc("confirm_portfolio_extension_order", {
      p_order_id: orderId,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ status: "confirmed" });
  }

  const localPaymentId = molliePayment.metadata?.payment_id;
  if (!localPaymentId) {
    return NextResponse.json({ error: "Missing metadata.payment_id" }, { status: 400 });
  }

  const { error } = await service.rpc("confirm_payment", {
    p_payment_id: localPaymentId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "confirmed" });
}
