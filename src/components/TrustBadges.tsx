import { ShieldIcon, ReceiptIcon, BuildingIcon } from "@/components/icons";

const badges = [
  { icon: ShieldIcon, label: "Beoordelingen alleen na echt contact" },
  { icon: ReceiptIcon, label: "Duidelijke prijs, geen verborgen kosten" },
  { icon: BuildingIcon, label: "Geverifieerd KvK-nummer" },
];

// Odznaki zaufania (ekran 1): rząd trzech, wyśrodkowany, ikony granatowe —
// bezpośrednia odpowiedź na skargi na Werkspot (pkt 11/14 specyfikacji).
export function TrustBadges() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 py-10 sm:flex-row sm:justify-center sm:gap-10">
      {badges.map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-2 text-vak-navy">
          <Icon className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">{label}</span>
        </div>
      ))}
    </div>
  );
}
