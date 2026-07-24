import Link from "next/link";
import Image from "next/image";
import { LoginButton } from "@/components/LoginButton";

// Nagłówek: tło granatowe, logo białe, link "Voor vakmensen" i przycisk
// logowania złote — dokładnie wg zatwierdzonego mockupu (ekran 1).
export function Header() {
  return (
    <header className="bg-vak-navy">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          {/* Wit tło pod logo — samo logo jest granatowe i ginie na
              granatowym pasku nagłówka bez kontrastującego podłoża. */}
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white p-1">
            <Image src="/logo.svg" alt="" width={24} height={24} priority />
          </span>
          <span className="text-xl font-extrabold text-white">VakFind</span>
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
