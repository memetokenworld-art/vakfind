import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// Klient z kluczem service_role — omija RLS całkowicie. Wolno go używać
// TYLKO w kodzie, który nigdy nie trafia do przeglądarki (webhook Mollie),
// i tylko tam, gdzie backend musi wykonać operację "z urzędu" (potwierdzenie
// płatności), niezależnie od tego, kto jest zalogowany — bo webhook
// dostawcy płatności w ogóle nie ma sesji użytkownika (KROK 10, komentarz
// przy confirm_payment).
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY ontbreekt in de omgevingsvariabelen.");
  }

  return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
