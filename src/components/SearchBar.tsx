"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SearchIcon, PinIcon } from "@/components/icons";

type CategoryMatch = {
  id: string;
  name: string;
  slug: string;
  match_score: number;
};

// Wyszukiwarka po synonimach (specyfikacja, pkt 16): klient wpisuje dowolną
// frazę, nie musi znać oficjalnej nazwy zawodu. Woła bezpośrednio funkcję
// search_categories() w bazie. Pole lokalizacji na razie czysto wizualne —
// realne wyszukiwanie w promieniu (pkt 12 specyfikacji, geokodowanie) to
// osobna funkcja do zbudowania później.
export function SearchBar() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [results, setResults] = useState<CategoryMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (query.trim().length < 2) return;

    const timeout = setTimeout(async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("search_categories", {
        query: query.trim(),
      });
      setLoading(false);
      if (!error && data) {
        setResults(data as CategoryMatch[]);
        setOpen(true);
      }
    }, 300);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleChange = (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setOpen(false);
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-lg sm:flex-row sm:items-center sm:rounded-full">
        <div className="flex flex-1 items-center gap-2 px-5 py-3.5">
          <SearchIcon className="h-5 w-5 shrink-0 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="bijv. loodgieter, meubels monteren"
            className="w-full text-sm text-vak-navy outline-none placeholder:text-gray-400"
          />
        </div>

        <div className="hidden h-8 w-px bg-gray-200 sm:block" />

        <div className="flex items-center gap-2 border-t border-gray-100 px-5 py-3.5 sm:w-40 sm:border-t-0">
          <PinIcon className="h-5 w-5 shrink-0 text-gray-400" />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Tilburg"
            className="w-full text-sm text-vak-navy outline-none placeholder:text-gray-400"
          />
        </div>

        <button
          type="button"
          className="m-1.5 shrink-0 rounded-full bg-vak-navy px-6 py-2.5 text-sm font-semibold text-vak-gold transition hover:bg-vak-navy-light"
        >
          Zoeken
        </button>
      </div>

      {open && (
        <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl bg-white shadow-xl">
          {loading && (
            <div className="px-5 py-3 text-sm text-gray-500">Zoeken…</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-5 py-3 text-sm text-gray-500">
              Geen categorie gevonden voor &ldquo;{query}&rdquo;.
            </div>
          )}
          {!loading &&
            results.map((r) => (
              <a
                key={r.id}
                href={`/categorie/${r.slug}`}
                className="block px-5 py-3 text-sm text-vak-navy hover:bg-vak-gold/10"
              >
                {r.name}
              </a>
            ))}
        </div>
      )}
    </div>
  );
}
