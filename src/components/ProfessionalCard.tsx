import Link from "next/link";
import { StarIcon } from "@/components/icons";

type ProfessionalCardData = {
  profileId: string;
  fullName: string;
  city: string | null;
  vakScore: number;
  reviewAvgRating: number;
  reviewCount: number;
  completedOrdersCount: number;
  bio: string | null;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Karta fachowca (ekran 1, sekcja "Aanbevolen in jouw buurt") — awatar z
// inicjałami, odznaka VakScore, ocena gwiazdkowa + licznik zrealizowanych
// zleceń (pkt 7g specyfikacji — broni nowych fachowców bez opinii jeszcze).
export function ProfessionalCard({ pro }: { pro: ProfessionalCardData }) {
  return (
    <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-vak-navy text-sm font-bold text-vak-gold">
            {initials(pro.fullName)}
          </div>
          <div>
            <p className="font-semibold text-vak-navy">{pro.fullName}</p>
            {pro.city && <p className="text-xs text-gray-500">{pro.city}</p>}
          </div>
        </div>
        <div className="rounded-full bg-vak-amber-bg px-3 py-1 text-sm font-bold text-vak-amber-text">
          {Math.round(pro.vakScore)}
        </div>
      </div>

      <p className="mt-4 line-clamp-2 flex-1 text-sm text-gray-600">
        {pro.bio ?? "Nog geen bedrijfsomschrijving toegevoegd."}
      </p>

      <div className="mt-4 flex items-center gap-1 text-sm text-vak-navy">
        <StarIcon className="h-4 w-4 text-vak-gold" />
        <span className="font-semibold">
          {pro.reviewCount > 0 ? pro.reviewAvgRating.toFixed(1) : "Nieuw"}
        </span>
        <span className="text-gray-400">
          · {pro.completedOrdersCount} opdrachten voltooid
        </span>
      </div>

      <Link
        href={`/fachowiec/${pro.profileId}`}
        className="mt-4 block rounded-full bg-vak-navy py-2.5 text-center text-sm font-semibold text-vak-gold transition hover:bg-vak-navy-light"
      >
        Bekijk profiel
      </Link>
    </div>
  );
}
