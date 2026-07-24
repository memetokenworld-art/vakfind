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
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 px-6 py-6 sm:flex-row sm:justify-center sm:gap-8">
      {badges.map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-1.5 text-vak-navy">
          <Icon className="h-4 w-4 shrink-0" />
          <span className="text-xs font-medium">{label}</span>
        </div>
      ))}
    </div>
  );
}
