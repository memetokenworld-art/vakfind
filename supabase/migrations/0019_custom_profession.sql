-- ============================================================================
-- KROK 19: Kategoria "Inne" — wolny tekst zawodu, widoczny i wyszukiwalny
-- od razu, bez kolejki moderacji
-- ============================================================================
-- Plan (sekcja 7): lista kategorii nigdy nie obejmie wszystkich zawodów.
-- Fachowiec wpisuje własny opis (np. "systeemplafond monteur"), widoczny na
-- profilu i przeszukiwany razem z kategoriami — bez blokującej moderacji.
alter table public.professional_profiles
  add column if not exists custom_profession text;

-- search_custom_professions: ten sam mechanizm (pg_trgm, KROK 1) co
-- search_categories(), ale przeszukuje wolny tekst zamiast oficjalnych
-- kategorii/synonimów. Wynik wskazuje bezpośrednio na profil fachowca
-- (nie na kategorię) — "Inne" to opis JEDNEJ osoby, nie wspólna etykieta.
create or replace function public.search_custom_professions(query text)
returns table (
  professional_id uuid,
  full_name text,
  custom_profession text,
  match_score real
)
language sql
stable
as $$
  select
    pp.profile_id,
    p.full_name,
    pp.custom_profession,
    similarity(pp.custom_profession, query) as match_score
  from public.professional_profiles pp
  join public.profiles p on p.id = pp.profile_id
  where pp.custom_profession is not null
    and (
      pp.custom_profession ilike '%' || query || '%'
      or similarity(pp.custom_profession, query) > 0.25
    )
  order by match_score desc
  limit 10;
$$;
