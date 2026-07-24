import { FullWidthCta } from "@/components/FullWidthCta";

type ProfessionalRowData = {
  profileId: string;
  fullName: string;
  city: string | null;
  vakScore: number;
  reviewAvgRating: number;
  reviewCount: number;
  completedOrdersCount: number;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Wiersz fachowca (ekran 1, "Polecani w Twojej okolicy") — płaski układ
// zgodny z zatwierdzonym mockupem: awatar + nazwa + lokalizacja, odznaka
// VakScore w rogu, ocena, i pełnoszerokościowa belka "Bekijk profiel" pod
// spodem. Celowo BEZ karty/cienia — dokładnie jak w oryginale.
export function ProfessionalRow({ pro }: { pro: ProfessionalRowData }) {
  return (
    <div className="border-b border-gray-100 py-5 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-vak-navy text-sm font-bold text-vak-gold">
            {initials(pro.fullName)}
          </div>
          <div>
            <p className="font-semibold text-vak-navy">{pro.fullName}</p>
            {pro.city && <p className="text-xs text-gray-500">{pro.city}</p>}
          </div>
        </div>
        <div className="rounded bg-vak-amber-bg px-2.5 py-1 text-sm font-bold text-vak-amber-text">
          {Math.round(pro.vakScore)}
        </div>
      </div>

      <p className="mt-2 text-sm text-gray-500">
        {pro.reviewCount > 0 ? pro.reviewAvgRating.toFixed(1) : "Nieuw"} ·{" "}
        {pro.completedOrdersCount} opdrachten voltooid
      </p>

      <div className="mt-4">
        <FullWidthCta href={`/fachowiec/${pro.profileId}`}>
          Bekijk profiel
        </FullWidthCta>
      </div>
    </div>
  );
}
