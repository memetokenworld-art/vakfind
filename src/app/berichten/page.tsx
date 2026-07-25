import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default async function InboxPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .single();

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, client_id, professional_id, last_message_at, created_at")
    .or(`client_id.eq.${user.id},professional_id.eq.${user.id}`)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const otherPartyIds = (conversations ?? []).map((c) =>
    c.client_id === user.id ? c.professional_id : c.client_id
  );

  const { data: otherProfiles } =
    otherPartyIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", otherPartyIds)
      : { data: [] };

  const nameFor = (id: string) =>
    (otherProfiles ?? []).find((p) => p.id === id)?.full_name ?? "Onbekend";

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="mx-auto max-w-xl px-6 py-14">
        <h1 className="text-xl font-bold text-vak-navy">Berichten</h1>

        {!conversations || conversations.length === 0 ? (
          <p className="mt-8 text-sm text-gray-400">
            {profile?.account_type === "client"
              ? "Nog geen gesprekken. Ontgrendel het contact van een vakman om te kunnen berichten."
              : "Nog geen gesprekken. Ontgrendel het contact van een opdracht om te kunnen berichten."}
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-gray-100">
            {conversations.map((c) => {
              const otherId = c.client_id === user.id ? c.professional_id : c.client_id;
              return (
                <li key={c.id}>
                  <Link
                    href={`/berichten/${c.id}`}
                    className="flex items-center justify-between py-4 hover:bg-gray-50"
                  >
                    <span className="text-sm font-semibold text-vak-navy">
                      {nameFor(otherId)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(c.last_message_at ?? c.created_at).toLocaleDateString("nl-NL", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <Footer />
    </div>
  );
}
