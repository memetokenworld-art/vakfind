"use client";

import { useState } from "react";

type Category = {
  id: string;
  name: string;
  slug: string;
};

// Chipy kategorii (ekran 1) — wyśrodkowane, zawijane, jedna aktywna naraz.
// Kliknięcie na razie tylko przełącza wygląd (podświetlenie); podłączenie
// do faktycznego filtrowania listy fachowców to kolejny krok.
export function CategoryChips({ categories }: { categories: Category[] }) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  return (
    <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-2 px-6 py-6">
      {categories.map((c) => {
        const active = c.slug === activeSlug;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiveSlug(active ? null : c.slug)}
            className={
              active
                ? "rounded-full bg-vak-navy px-4 py-2 text-sm font-medium text-vak-gold"
                : "rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-vak-navy hover:border-vak-gold"
            }
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
