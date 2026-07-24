type OrderStatus = "active" | "in_progress" | "completed" | "closed";

const styles: Record<OrderStatus, string> = {
  active: "bg-vak-success-bg text-vak-success-text",
  in_progress: "bg-vak-amber-bg text-vak-amber-text",
  completed: "bg-vak-blue-alt-bg text-vak-blue-alt-text",
  closed: "bg-gray-100 text-gray-500",
};

const labels: Record<OrderStatus, string> = {
  active: "Actief",
  in_progress: "In behandeling",
  completed: "Voltooid",
  closed: "Gesloten",
};

// Odznaka statusu zlecenia — te same kolory co reszta serwisu (paleta z
// pakietu dla Claude Code): zielona/bursztynowa/niebieska/szara.
export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
