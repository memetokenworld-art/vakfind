import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MessageForm } from "@/components/MessageForm";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, client_id, professional_id")
    .eq("id", id)
    .maybeSingle();

  if (!conversation) {
    notFound();
  }

  const otherId =
    conversation.client_id === user.id ? conversation.professional_id : conversation.client_id;

  const { data: otherProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", otherId)
    .single();

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="mx-auto flex max-w-xl flex-col px-6 py-14">
        <Link href="/berichten" className="text-xs text-gray-400 hover:underline">
          ← Alle gesprekken
        </Link>
        <h1 className="mt-2 text-lg font-bold text-vak-navy">
          {otherProfile?.full_name ?? "Gesprek"}
        </h1>

        <div className="mt-6 space-y-3">
          {!messages || messages.length === 0 ? (
            <p className="text-sm text-gray-400">Nog geen berichten. Stuur het eerste bericht.</p>
          ) : (
            messages.map((m) => {
              const isMine = m.sender_id === user.id;
              return (
                <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-md px-4 py-2.5 text-sm ${
                      isMine ? "bg-vak-navy text-white" : "bg-gray-100 text-vak-navy"
                    }`}
                  >
                    <p>{m.body}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        isMine ? "text-vak-gold/70" : "text-gray-400"
                      }`}
                    >
                      {new Date(m.created_at).toLocaleString("nl-NL", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6">
          <MessageForm conversationId={id} />
        </div>
      </div>
      <Footer />
    </div>
  );
}
