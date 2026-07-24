"use client";

import { createClient } from "@/lib/supabase/client";

// Logowanie klienta wyłącznie przez konto Google — zgodnie z ustaleniami
// (regulamin, pkt 2: "Klient: osoba fizyczna, rejestracja przez konto Google").
export function LoginButton() {
  const supabase = createClient();

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <button
      onClick={handleLogin}
      className="rounded-full bg-vak-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-vak-navy-light"
    >
      Inloggen met Google
    </button>
  );
}
