"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Powiadomienie systemowe (ekran 4): fachowiec odblokował kontakt, klient
// potwierdza czy sprawa jest załatwiona. "Tak, zamknij" -> complete_order(),
// "Nie, szukam dalej" zostawia zlecenie w "W realizacji" (nic nie robi —
// automatyczne zamknięcie po 3 dniach i tak zadziała, jeśli klient nic
// nie zrobi).
export function OrderStatusActions({
  orderId,
  professionalName,
  unlockedDaysAgo,
}: {
  orderId: string;
  professionalName: string;
  unlockedDaysAgo: number;
}) {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleComplete = async () => {
    setSubmitting(true);
    await supabase.rpc("complete_order", { p_order_id: orderId });
    router.refresh();
  };

  const handleReopen = async () => {
    setSubmitting(true);
    await supabase.rpc("reopen_order", { p_order_id: orderId });
    router.refresh();
  };

  return (
    <div className="mt-6 rounded-md bg-vak-blue-alt-bg px-5 py-4">
      <p className="text-sm text-vak-blue-alt-text">
        {professionalName} heeft je contact ontgrendeld{" "}
        {unlockedDaysAgo === 0 ? "vandaag" : `${unlockedDaysAgo} dagen geleden`}
      </p>
      <p className="mt-1 text-sm font-medium text-vak-navy">
        Is de klus al geregeld?
      </p>
      <div className="mt-3 flex gap-4">
        <button
          type="button"
          onClick={handleComplete}
          disabled={submitting}
          className="rounded bg-vak-navy px-4 py-2 text-sm font-semibold text-vak-gold disabled:opacity-60"
        >
          Ja, sluiten
        </button>
        <button
          type="button"
          onClick={handleReopen}
          disabled={submitting}
          className="text-sm font-medium text-vak-amber-text disabled:opacity-60"
        >
          Nee, ik zoek verder
        </button>
      </div>
    </div>
  );
}
