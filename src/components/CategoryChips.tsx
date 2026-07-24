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
    <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-1.5 px-6 py-5">
      {categories.map((c) => {
        const active = c.slug === activeSlug;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiveSlug(active ? null : c.slug)}
            className={
              active
                ? "rounded px-3.5 py-1.5 text-sm font-semibold bg-vak-navy text-vak-gold"
                : "rounded px-3.5 py-1.5 text-sm font-medium text-gray-500 hover:text-vak-navy"
            }
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
