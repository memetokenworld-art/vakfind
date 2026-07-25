// Klient Mollie (iDEAL/karta) — punkt 3 planu: procesor płatności do
// doładowania portfela VakGuldenów. Zwykły fetch do REST API Mollie
// (https://docs.mollie.com/reference/v2/payments-api/create-payment) —
// nie ma sensu ciągnąć całego SDK dla dwóch wywołań.
//
// Klucz API musi być SERWEROWY (bez NEXT_PUBLIC_) — wołane wyłącznie z
// Server Actions i z webhooka (route handler), nigdy z przeglądarki.
const MOLLIE_API_BASE = "https://api.mollie.com/v2";

type MolliePayment = {
  id: string;
  status: "open" | "pending" | "paid" | "failed" | "canceled" | "expired";
  metadata: Record<string, string> | null;
  _links: { checkout?: { href: string } };
};

function apiKey(): string {
  const key = process.env.MOLLIE_API_KEY;
  if (!key) {
    throw new Error("MOLLIE_API_KEY ontbreekt in de omgevingsvariabelen.");
  }
  return key;
}

export async function createMolliePayment(input: {
  amountEur: number;
  description: string;
  redirectUrl: string;
  webhookUrl: string;
  metadata: Record<string, string>;
}): Promise<MolliePayment> {
  const res = await fetch(`${MOLLIE_API_BASE}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: { currency: "EUR", value: input.amountEur.toFixed(2) },
      description: input.description,
      redirectUrl: input.redirectUrl,
      // Mollie accepteert geen webhookUrl op localhost (niet publiek
      // bereikbaar) — dan slaan we hem gewoon over, de gebruiker ziet de
      // betaalstatus na terugkeer via redirectUrl (zie /portfel/verwerken).
      ...(input.webhookUrl.startsWith("https://") ? { webhookUrl: input.webhookUrl } : {}),
      metadata: input.metadata,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Mollie betaling aanmaken mislukt (${res.status}): ${body}`);
  }

  return res.json();
}

export async function getMolliePayment(paymentId: string): Promise<MolliePayment> {
  const res = await fetch(`${MOLLIE_API_BASE}/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Mollie betaling ophalen mislukt (${res.status}): ${body}`);
  }

  return res.json();
}
