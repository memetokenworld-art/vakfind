import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StatusBadge } from "@/components/StatusBadge";
import { OrderStatusActions } from "@/components/OrderStatusActions";

function daysAgo(dateString: string) {
  const ms = Date.now() - new Date(dateString).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

// Panel zarządzania statusem ogłoszenia (ekran 4) — widoczny wyłącznie dla
// klienta, który wystawił zlecenie (RLS: orders_select_own_client).
export default async function OrderStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, title, city, status, created_at, assigned_professional_id, in_progress_started_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (!order) {
    notFound();
  }

  let professionalName: string | null = null;
  if (order.assigned_professional_id) {
    const { data: pro } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", order.assigned_professional_id)
      .maybeSingle();
    professionalName = pro?.full_name ?? null;
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="mx-auto max-w-xl px-6 py-10">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-vak-navy">{order.title}</h1>
            <p className="text-sm text-gray-500">
              {order.city} · geplaatst {daysAgo(order.created_at)} dagen geleden
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {order.status === "in_progress" &&
          order.assigned_professional_id &&
          order.in_progress_started_at && (
            <OrderStatusActions
              orderId={order.id}
              professionalName={professionalName ?? "Een vakman"}
              unlockedDaysAgo={daysAgo(order.in_progress_started_at)}
            />
          )}

        {order.status === "completed" && (
          <p className="mt-6 rounded-md bg-vak-success-bg px-5 py-4 text-sm text-vak-success-text">
            Deze opdracht is afgerond.
          </p>
        )}

        {order.status === "closed" && (
          <p className="mt-6 rounded-md bg-gray-50 px-5 py-4 text-sm text-gray-500">
            Deze opdracht is gesloten.
          </p>
        )}

        <p className="mt-10 text-center text-xs text-gray-400">
          Opdrachten zonder activiteit sluiten automatisch na 3 dagen
        </p>
      </div>

      <Footer />
    </div>
  );
}
