const badges = [
  {
    title: "Beoordelingen na echt contact",
    description: "Geen nep-reviews — alleen na een betaald, geregistreerd contact.",
  },
  {
    title: "Duidelijke prijs, geen abonnement",
    description: "1€ voor klanten, 5€ voor vakmensen. Geen verborgen kosten.",
  },
  {
    title: "Geverifieerd KvK-nummer",
    description: "Elke vakman is gecontroleerd bij het Handelsregister.",
  },
];

// Odznaki zaufania z pkt 11/14 specyfikacji — celowo widoczne na stronie
// głównej, nie tylko w regulaminie (bezpośrednia odpowiedź na skargi na Werkspot).
export function TrustBadges() {
  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 py-12 md:grid-cols-3">
      {badges.map((b) => (
        <div
          key={b.title}
          className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm"
        >
          <p className="font-semibold text-vak-navy">{b.title}</p>
          <p className="mt-2 text-sm text-gray-500">{b.description}</p>
        </div>
      ))}
    </div>
  );
}
