import Link from "next/link";
import { LoginButton } from "@/components/LoginButton";

// Nagłówek: tło granatowe, logo białe, link "Voor vakmensen" i przycisk
// logowania złote — dokładnie wg zatwierdzonego mockupu (ekran 1).
export function Header() {
  return (
    <header className="bg-vak-navy">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-2xl font-extrabold text-white">
          VakFind
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/voor-vakmensen"
            className="hidden text-sm font-medium text-vak-gold hover:text-vak-gold-light sm:block"
          >
            Voor vakmensen
          </Link>
          <LoginButton />
        </div>
      </div>
    </header>
  );
}
