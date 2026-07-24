// Proste ikony liniowe (bez dodatkowej zależności) używane w odznakach
// zaufania na stronie głównej.
export function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className={className}
    >
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function ReceiptIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className={className}
    >
      <path d="M6 3h12v18l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3V3z" />
      <path strokeLinecap="round" d="M9 8h6M9 12h6M9 16h3" />
    </svg>
  );
}

export function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className={className}
    >
      <path d="M5 21V5a1 1 0 011-1h6a1 1 0 011 1v16M13 21v-8a1 1 0 011-1h4a1 1 0 011 1v8" />
      <path strokeLinecap="round" d="M8 7h0M8 11h0M8 15h0" />
    </svg>
  );
}

export function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className={className}
    >
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
    </svg>
  );
}

export function PinIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className={className}
    >
      <path d="M12 21s7-6.5 7-11.5a7 7 0 10-14 0C5 14.5 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.25" />
    </svg>
  );
}

export function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2l2.9 6.26 6.9.6-5.2 4.6 1.6 6.8L12 16.9l-6.2 3.36 1.6-6.8-5.2-4.6 6.9-.6L12 2z" />
    </svg>
  );
}
