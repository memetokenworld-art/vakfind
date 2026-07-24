import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Next.js "łata" globalny fetch() w Server Components i domyślnie
      // cache'uje odpowiedzi — bez tego dane z Supabase (status zlecenia,
      // % kompletności profilu, VakScore...) potrafiłyby pokazywać starą
      // wartość mimo router.refresh(). Wymuszamy zawsze świeże zapytanie.
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Wołane tylko z Server Actions / Route Handlers — w Server
          // Components zapis ciasteczek jest niedozwolony i celowo
          // ignorowany (odświeżanie sesji i tak obsługuje proxy.ts).
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // ignore — wywołane z Server Component
          }
        },
      },
    }
  );
}
