import Link from "next/link";
import Image from "next/image";
import { LoginButton } from "@/components/LoginButton";
import { LogoutButton } from "@/components/LogoutButton";
import { createClient } from "@/lib/supabase/server";

// Nagłówek: tło granatowe, logo białe — dokładnie wg zatwierdzonego
// mockupu (ekran 1). Świadomie zamieniony na async server component,
// żeby pokazywać właściwe linki nawigacji zależnie od tego, czy ktoś
// jest zalogowany i jaką ma rolę (klient / fachowiec).
export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let accountType: "client" | "professional" | null = null;
  let walletBalance: number | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_type")
      .eq("id", user.id)
      .maybeSingle();
    accountType = profile?.account_type ?? null;

    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("profile_id", user.id)
      .maybeSingle();
    walletBalance = wallet?.balance ?? null;
  }

  return (
    <header className="bg-vak-navy">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          {/* Wit tło pod logo — samo logo jest granatowe i ginie na
              granatowym pasku nagłówka bez kontrastującego podłoża. */}
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white p-1">
            <Image src="/logo.svg" alt="" width={24} height={24} priority />
          </span>
          <span className="text-xl font-extrabold text-white">VakFind</span>
        </Link>

        <div className="flex items-center gap-6">
          {!user && (
            <Link
              href="/voor-vakmensen"
              className="hidden text-sm font-medium text-vak-gold hover:text-vak-gold-light sm:block"
            >
              Voor vakmensen
            </Link>
          )}

          {accountType === "client" && (
            <Link
              href="/zlecenie/nieuw"
              className="hidden text-sm font-medium text-vak-gold hover:text-vak-gold-light sm:block"
            >
              Nieuwe klus
            </Link>
          )}

          {accountType === "professional" && (
            <Link
              href="/opdrachten"
              className="hidden text-sm font-medium text-vak-gold hover:text-vak-gold-light sm:block"
            >
              Opdrachten
            </Link>
          )}

          {user && (
            <Link
              href="/portfel"
              className="hidden items-center gap-1 rounded border border-vak-gold/40 px-2.5 py-1 text-sm font-semibold text-vak-gold hover:bg-vak-navy-light sm:flex"
            >
              €{Number(walletBalance ?? 0).toFixed(2)}
            </Link>
          )}

          {user && (
            <Link
              href="/profiel"
              className="hidden text-sm font-medium text-vak-gold hover:text-vak-gold-light sm:block"
            >
              Mijn profiel
            </Link>
          )}

          {user ? <LogoutButton /> : <LoginButton />}
        </div>
      </div>
    </header>
  );
}
