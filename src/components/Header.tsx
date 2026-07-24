import Link from "next/link";
import { LoginButton } from "@/components/LoginButton";

export function Header() {
  return (
    <header className="border-b border-gray-100 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-baseline gap-1">
          <span className="text-2xl font-extrabold text-vak-navy">Vak</span>
          <span className="text-2xl font-extrabold text-vak-gold">Find</span>
        </Link>

        <nav className="hidden gap-8 text-sm font-medium text-vak-navy md:flex">
          <Link href="/" className="hover:text-vak-gold">
            Vind een vakman
          </Link>
          <Link href="/zzp-en-bedrijven" className="hover:text-vak-gold">
            Zzp of bedrijf?
          </Link>
        </nav>

        <LoginButton />
      </div>
    </header>
  );
}
