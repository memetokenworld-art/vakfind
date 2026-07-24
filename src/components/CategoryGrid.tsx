import Link from "next/link";

type Category = {
  id: string;
  name: string;
  slug: string;
};

// Renderowane po stronie serwera, danymi pobranymi z Supabase w page.tsx —
// to jest ta sama tabela "categories", którą wgraliśmy przez seed.sql.
export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <h2 className="mb-6 text-2xl font-bold text-vak-navy">
        Populaire categorieën
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/categorie/${c.slug}`}
            className="rounded-xl border border-gray-100 bg-white px-4 py-5 text-center text-sm font-medium text-vak-navy shadow-sm transition hover:border-vak-gold hover:shadow-md"
          >
            {c.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
