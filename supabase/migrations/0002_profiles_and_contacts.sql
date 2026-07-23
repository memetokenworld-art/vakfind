-- ============================================================================
-- KROK 2: Konta użytkowników (profiles) i dane kontaktowe (profile_contacts)
-- ============================================================================
-- Supabase Auth sam prowadzi tabelę auth.users (logowanie, hasła, konto
-- Google). Tabela "profiles" to jej rozszerzenie o dane biznesowe VakFind —
-- jeden wiersz na użytkownika, wspólny dla klientów i fachowców.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  account_type public.account_type not null,
  full_name text not null,
  avatar_url text,
  city text,
  postal_code text,
  -- Współrzędne "bazy" użytkownika (adres fachowca / domyślna lokalizacja
  -- klienta) — potrzebne do wyszukiwania "fachowiec w promieniu X km"
  latitude double precision,
  longitude double precision,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_account_type_idx on public.profiles (account_type);

-- Indeks przyspieszający wyszukiwanie po odległości (patrz KROK 4/5)
create index profiles_location_idx on public.profiles
  using gist (ll_to_earth(latitude, longitude))
  where latitude is not null and longitude is not null;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- profile_contacts: telefon, email, dokładny adres.
--
-- Celowo ODDZIELONE od "profiles" w osobnej tabeli, bo to są dokładnie te
-- dane, za których ujawnienie VakFind pobiera opłatę (1€ klient / 5€
-- fachowiec — system odblokowywania kontaktów, KROK 6). Gdyby telefon/email
-- siedziały w "profiles", nie dałoby się ich łatwo ukryć przed opłatą —
-- każdy mógłby je zobaczyć od razu. Dzięki osobnej tabeli i regułom
-- bezpieczeństwa (RLS, KROK 10) telefon jest widoczny tylko dla: właściciela
-- konta oraz osób, które faktycznie zapłaciły za odblokowanie.
-- ----------------------------------------------------------------------------
create table public.profile_contacts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  phone text,
  email text not null,
  street_address text,
  updated_at timestamptz not null default now()
);

create trigger profile_contacts_set_updated_at
  before update on public.profile_contacts
  for each row execute function public.set_updated_at();

-- Portfel VakGulden (wewnętrzna waluta) tworzony automatycznie dla każdego
-- nowego konta — szczegóły portfela w KROKU 6, tu tylko "hak" tworzący go
-- od razu przy rejestracji, żeby nigdy nie było konta bez portfela.
create table public.wallets (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  balance numeric(12,2) not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create trigger wallets_set_updated_at
  before update on public.wallets
  for each row execute function public.set_updated_at();

-- SECURITY DEFINER: portfel jest tworzony "z urzędu" przy rejestracji, nie
-- przez samego użytkownika — celowo NIE ma polityki RLS pozwalającej na
-- bezpośredni insert do wallets (KROK 10), więc ten trigger musi działać
-- z podwyższonymi uprawnieniami, inaczej RLS zablokowałby własny insert
-- triggera tuż po tym, jak użytkownik założy konto.
create or replace function public.create_wallet_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.wallets (profile_id) values (new.id);
  return new;
end;
$$;

create trigger profiles_create_wallet
  after insert on public.profiles
  for each row execute function public.create_wallet_for_profile();
