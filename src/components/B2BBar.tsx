import Link from "next/link";

// Pasek B2B (ekran 1, dół strony) — jasnoszare tło, oddzielone linią,
// przycisk obrysowany (nie wypełniony). Celowo stonowany wizualnie wobec
// głównego modelu, zgodnie ze strategią "zacznij wąsko" (punkt 19/20 specyfikacji).
export function B2BBar() {
  return (
    <section className="border-t border-gray-200 bg-gray-50 px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="text-center sm:text-left">
          <p className="font-semibold text-vak-navy">
            Ben je zzp&apos;er of bedrijf?
          </p>
          <p className="text-sm text-gray-500">
            Vind een project of een aannemer om mee samen te werken
          </p>
        </div>
        <Link
          href="/zzp-en-bedrijven"
          className="shrink-0 rounded-full border border-vak-navy px-5 py-2.5 text-sm font-semibold text-vak-navy transition hover:bg-vak-navy hover:text-white"
        >
          Vind een project / aannemer →
        </Link>
      </div>
    </section>
  );
}
