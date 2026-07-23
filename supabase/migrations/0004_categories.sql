-- ============================================================================
-- KROK 4: Kategorie usług i inteligentne wyszukiwanie po synonimach
-- ============================================================================
-- Dwupoziomowa struktura, dokładnie jak w dokumencie
-- "vakfind-kategorie-i-frazy.md": grupa (np. "Instalacje") -> konkretny
-- zawód (np. "Loodgieter / Hydraulik"). Grupa to wiersz z parent_id = null,
-- zawód to wiersz wskazujący na swoją grupę przez parent_id.
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,              -- oficjalna nazwa PO NIDERLANDZKU (język interfejsu)
  name_pl text,                    -- tłumaczenie referencyjne (na start tylko do panelu admina)
  slug text not null unique,
  parent_id uuid references public.categories(id) on delete set null,
  icon_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index categories_name_unique on public.categories (lower(name));
create index categories_parent_idx on public.categories (parent_id);
create index categories_name_trgm_idx on public.categories using gin (name gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- Synonimy/frazy wyszukiwania. To jest serce "inteligentnego wyszukiwania"
-- z punktu 16 specyfikacji: klient wpisuje "składanie mebli" i ma trafić na
-- kategorię "Meubelmontage", mimo że nie zna tej nazwy. Jeden wiersz =
-- jedna fraza w jednym języku (nl/en na start, zgodnie z decyzją o języku
-- interfejsu + obserwacją, że sporo opinii o konkurencji jest po angielsku).
-- ----------------------------------------------------------------------------
create table public.category_synonyms (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  synonym text not null,
  language text not null default 'nl' check (language in ('nl', 'en')),
  created_at timestamptz not null default now(),
  constraint category_synonyms_unique unique (category_id, synonym, language)
);

-- Indeks trigramowy: pozwala znaleźć dopasowanie nawet przy literówce
-- albo innej odmianie słowa ("meubelmontage" vs "meubels monteren").
create index category_synonyms_trgm_idx on public.category_synonyms using gin (synonym gin_trgm_ops);
create index category_synonyms_category_idx on public.category_synonyms (category_id);

-- ----------------------------------------------------------------------------
-- Które kategorie obsługuje dany fachowiec (relacja M:N — jeden fachowiec
-- może pracować w kilku kategoriach, np. "Timmerman" i "Meubelmontage").
-- ----------------------------------------------------------------------------
create table public.professional_categories (
  professional_id uuid not null references public.professional_profiles(profile_id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (professional_id, category_id)
);

create index professional_categories_category_idx on public.professional_categories (category_id);

create trigger professional_categories_touch_profile
  after insert or delete on public.professional_categories
  for each row execute function public.touch_professional_profile();

-- ----------------------------------------------------------------------------
-- Funkcja wyszukiwania: klient wpisuje dowolny tekst, funkcja zwraca
-- pasujące kategorie posortowane od najlepszego dopasowania.
-- Łączy trzy sposoby dopasowania:
--   1. dokładne/częściowe dopasowanie tekstu (ILIKE) w nazwie lub synonimie
--   2. podobieństwo trigramowe (similarity) — łapie literówki i odmiany
-- ----------------------------------------------------------------------------
create or replace function public.search_categories(query text)
returns table (
  id uuid,
  name text,
  slug text,
  parent_id uuid,
  match_score real
)
language sql
stable
as $$
  select
    c.id,
    c.name,
    c.slug,
    c.parent_id,
    greatest(
      similarity(c.name, query),
      coalesce(max(similarity(s.synonym, query)), 0)
    ) as match_score
  from public.categories c
  left join public.category_synonyms s on s.category_id = c.id
  where c.is_active
    and (
      c.name ilike '%' || query || '%'
      or s.synonym ilike '%' || query || '%'
      or similarity(c.name, query) > 0.25
      or similarity(coalesce(s.synonym, ''), query) > 0.25
    )
  group by c.id, c.name, c.slug, c.parent_id
  order by match_score desc;
$$;
