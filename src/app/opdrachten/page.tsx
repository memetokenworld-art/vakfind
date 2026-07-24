import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StatusBadge } from "@/components/StatusBadge";
import { OrderUnlockButton } from "@/components/OrderUnlockButton";

function daysAgo(dateString: string) {
  const ms = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days < 1) return "vandaag";
  return `${days} dagen geleden`;
}

// Widok fachowca przeglądającego dostępne zlecenia (ekran 6) — pokazuje
// też zajęte zlecenia (na szaro, "Niet beschikbaar") dla transparentności,
// dzięki dodatkowej regule RLS z migracji 0011.
export default async function AvailableOrdersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, title, description, city, status, created_at, assigned_professional_id"
    )
    .in("status", ["active", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(20);

  const orderIds = (orders ?? []).map((o) => o.id);
  const { data: unlocks } =
    orderIds.length > 0
      ? await supabase
          .from("order_contact_unlocks")
          .select("order_id")
          .in("order_id", orderIds)
      : { data: [] };

  const unlockCount = (orderId: string) =>
    (unlocks ?? []).filter((u) => u.order_id === orderId).length;

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-lg font-bold text-vak-navy">
          Beschikbare opdrachten in jouw regio
        </h1>

        {!orders || orders.length === 0 ? (
          <p className="mt-8 text-sm text-gray-400">
            Er zijn op dit moment geen opdrachten beschikbaar.
          </p>
        ) : (
          <div className="mt-6">
            {orders.map((order) => {
              const isMine = order.assigned_professional_id === user?.id;
              const isTaken = order.status === "in_progress" && !isMine;

              return (
                <div
                  key={order.id}
                  className={`border-b border-gray-100 py-5 last:border-0 ${
                    isTaken ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-vak-navy">
                        {order.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.city} · {daysAgo(order.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>

                  <p className="mt-2 text-sm text-gray-600">
                    {order.description}
                  </p>

                  {isTaken ? (
                    <p className="mt-3 text-xs text-gray-400">
                      Al ontgrendeld door een andere vakman
                    </p>
                  ) : (
                    <p className="mt-3 text-xs text-gray-400">
                      {unlockCount(order.id)} vakmensen hebben dit ontgrendeld
                    </p>
                  )}

                  <div className="mt-3 flex justify-end">
                    {isMine ? (
                      <span className="text-sm font-medium text-vak-success-text">
                        Door jou ontgrendeld
                      </span>
                    ) : isTaken ? (
                      <span className="text-sm font-medium text-gray-400">
                        Niet beschikbaar
                      </span>
                    ) : (
                      <OrderUnlockButton orderId={order.id} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
