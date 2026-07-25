import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TopUpForm } from "@/components/TopUpForm";

const TX_LABELS: Record<string, string> = {
  topup: "Opwaardering",
  contact_unlock: "Contact ontgrendeld",
  refund: "Terugbetaling",
  bonus: "Bonus",
  adjustment: "Correctie",
};

export default async function WalletPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance")
    .eq("profile_id", user.id)
    .maybeSingle();

  const { data: transactions } = await supabase
    .from("wallet_transactions")
    .select("id, amount, type, description, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="mx-auto max-w-2xl px-6 py-14">
        <h1 className="text-xl font-bold text-vak-navy">Mijn portfel</h1>

        <div className="mt-4 rounded-md bg-vak-navy px-6 py-5 text-center">
          <p className="text-xs font-medium text-vak-gold">Huidig saldo</p>
          <p className="mt-1 text-3xl font-extrabold text-white">
            €{Number(wallet?.balance ?? 0).toFixed(2)}
          </p>
        </div>

        <div className="mt-6">
          <TopUpForm />
        </div>

        <div className="mt-10">
          <h2 className="text-sm font-semibold text-vak-navy">Transacties</h2>
          {transactions && transactions.length > 0 ? (
            <ul className="mt-3 divide-y divide-gray-100">
              {transactions.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-700">
                      {TX_LABELS[tx.type] ?? tx.type}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(tx.created_at).toLocaleDateString("nl-NL", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span
                    className={`font-semibold ${
                      Number(tx.amount) >= 0 ? "text-vak-success-text" : "text-gray-600"
                    }`}
                  >
                    {Number(tx.amount) >= 0 ? "+" : ""}
                    €{Number(tx.amount).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-gray-400">Nog geen transacties.</p>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
