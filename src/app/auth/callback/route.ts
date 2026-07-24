import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Odbiera powrót z Google OAuth, wymienia kod na sesję Supabase.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Pierwsze logowanie? Nie ma jeszcze wiersza w profiles (klient czy
      // fachowiec) — dokończ profil, zanim przejdziesz dalej.
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!profile) {
        return NextResponse.redirect(
          `${origin}/profiel/nieuw?next=${encodeURIComponent(next)}`
        );
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?login_error=1`);
}
