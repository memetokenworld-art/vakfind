"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CategoryMatch = {
  id: string;
  name: string;
  slug: string;
  match_score: number;
};

// Wyszukiwarka po synonimach (specyfikacja, pkt 16): klient wpisuje dowolną
// frazę, nie musi znać oficjalnej nazwy zawodu. Woła bezpośrednio funkcję
// search_categories() w bazie — dokładnie tę przetestowaną wcześniej na żywo.
export function SearchBar() {
  const [query, setQuery] = useState("");
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
    <div className="relative mx-auto w-full max-w-xl">
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Wat heb je nodig? bv. 'meubels monteren'"
        className="w-full rounded-full border border-white/20 bg-white px-6 py-4 text-base text-vak-navy shadow-lg outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-vak-gold"
      />

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
