import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

const className =
  "block w-full bg-vak-navy px-6 py-3.5 text-center text-sm font-semibold text-vak-gold transition hover:bg-vak-navy-light";

// Pełnoszerokościowa, płaska belka granat/złoto — powtarzający się wzorzec
// głównego przycisku akcji w zatwierdzonych mockupach (screen 2, 3, 6, 7, 8:
// "Odblokuj kontakt", "Opublikuj zlecenie", "Zobacz profil", "Przejdź do
// panelu"...). Celowo BEZ zaokrągleń/cieni — tak jak w oryginale.
export function FullWidthCta({
  href,
  children,
  ...rest
}: { href: string; children: React.ReactNode } & Omit<
  ComponentPropsWithoutRef<typeof Link>,
  "href" | "className"
>) {
  return (
    <Link href={href} className={className} {...rest}>
      {children}
    </Link>
  );
}

export function FullWidthCtaButton({
  children,
  ...rest
}: { children: React.ReactNode } & Omit<
  ComponentPropsWithoutRef<"button">,
  "className"
>) {
  return (
    <button type="button" className={className} {...rest}>
      {children}
    </button>
  );
}
