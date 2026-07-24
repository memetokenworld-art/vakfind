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
    <div className="relative mx-auto w-full max-w-[560px]">
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-center">
        <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2.5 sm:w-64">
          <SearchIcon className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="bijv. loodgieter, meubels monteren"
            className="w-full text-sm text-vak-navy outline-none placeholder:text-gray-400"
          />
        </div>

        <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2.5 sm:w-36">
          <PinIcon className="h-4 w-4 shrink-0 text-gray-400" />
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
          className="shrink-0 rounded-md bg-vak-navy px-6 py-2.5 text-sm font-semibold text-vak-gold transition hover:bg-vak-navy-light"
        >
          Zoeken
        </button>
      </div>

      {open && (
        <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg">
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
