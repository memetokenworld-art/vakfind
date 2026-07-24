import Link from "next/link";

// Osobny, wyraźnie oddzielony pasek pod głównym przepływem (specyfikacja,
// pkt 19) — segment B2B jest dostępny, ale nie konkuruje wizualnie z
// głównym modelem (zgodnie ze strategią "zacznij wąsko").
export function B2BBar() {
  return (
    <section className="bg-vak-navy px-6 py-10 text-center text-white">
      <p className="text-lg font-semibold">
        Ben je zzp&apos;er of bedrijf? Vind een project of onderaannemer.
      </p>
      <Link
        href="/zzp-en-bedrijven"
        className="mt-4 inline-block rounded-full bg-vak-gold px-6 py-2 text-sm font-semibold text-vak-navy transition hover:bg-vak-gold-light"
      >
        Naar de B2B-sectie
      </Link>
    </section>
  );
}
