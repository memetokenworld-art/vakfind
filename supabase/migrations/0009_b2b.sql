-- ============================================================================
-- KROK 9: Segment B2B — ZZP szukający projektów / firmy szukające podwykonawców
-- ============================================================================
-- Zgodnie z decyzją "lekka wersja od startu — test rynkowy" (punkt 19/20
-- specyfikacji): to NIE jest pełna agencja pośrednictwa pracy (świadomie,
-- ze względów prawnych — schijnzelfstandigheid, WTTA). To czysty katalog:
-- profile firm/ZZP, które można przeglądać i którym można odblokować
-- kontakt za stałą opłatą. VakFind nie pośredniczy w umowie ani płatności
-- między stronami.
--
-- Dostęp wyłącznie dla podmiotów z numerem KvK — stąd b2b_profiles ma
-- WŁASNE pole kvk_number, niezależne od professional_profiles.kvk_number,
-- bo stroną B2B może być też konto typu "client" (firma szukająca
-- podwykonawcy), które nie ma w ogóle wiersza w professional_profiles.
create table public.b2b_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  role public.b2b_role not null,

  kvk_number text not null,
  kvk_verified boolean not null default false,
  company_name text not null,

  competency_description text not null,   -- co dokładnie potrafi robić / kogo szuka
  team_size smallint,
  max_travel_distance_km smallint,
  rate_min numeric(10,2),
  rate_max numeric(10,2),
  -- charakter projektów w B2B jest inny niż jednorazowe zlecenia domowe —
  -- przeważnie wielodniowe/miesięczne/roczne (punkt 19)
  project_duration_type text not null check (project_duration_type in ('multi_day', 'monthly', 'yearly')),

  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index b2b_profiles_role_idx on public.b2b_profiles (role);

create trigger b2b_profiles_set_updated_at
  before update on public.b2b_profiles
  for each row execute function public.set_updated_at();

-- Kategorie/branże, w których działa dany profil B2B (reużywamy tę samą
-- tabelę categories co w modelu głównym — ta sama taksonomia zawodów).
create table public.b2b_profile_categories (
  b2b_profile_id uuid not null references public.b2b_profiles(profile_id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (b2b_profile_id, category_id)
);

-- ----------------------------------------------------------------------------
-- Abonament 50€/miesiąc — nielimitowane odblokowania kontaktów w segmencie
-- B2B przez cały okres ważności. Częściowy unikalny indeks niżej gwarantuje,
-- że jeden profil ma najwyżej jeden AKTYWNY abonament naraz.
-- ----------------------------------------------------------------------------
create table public.b2b_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.b2b_profiles(profile_id) on delete cascade,
  price numeric(6,2) not null default 50.00,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  wallet_transaction_id uuid references public.wallet_transactions(id),
  created_at timestamptz not null default now()
);

create unique index b2b_subscriptions_one_active_idx
  on public.b2b_subscriptions (profile_id)
  where status = 'active';

-- ----------------------------------------------------------------------------
-- Odblokowanie kontaktu w B2B — 20€ jednorazowo, symetrycznie w obie strony,
-- albo za darmo (price = 0), jeśli odblokowujący ma w danej chwili aktywny
-- abonament. unlock_via zapisuje, z której ścieżki skorzystano — ważne dla
-- rozliczeń i dla przyszłych analiz (AI Manager).
-- ----------------------------------------------------------------------------
create table public.b2b_contact_unlocks (
  id uuid primary key default gen_random_uuid(),
  unlocker_profile_id uuid not null references public.b2b_profiles(profile_id) on delete cascade,
  target_profile_id uuid not null references public.b2b_profiles(profile_id) on delete cascade,
  price numeric(6,2) not null,
  unlock_via text not null check (unlock_via in ('one_time', 'subscription')),
  wallet_transaction_id uuid references public.wallet_transactions(id),
  unlocked_at timestamptz not null default now(),
  constraint b2b_contact_unlocks_unique unique (unlocker_profile_id, target_profile_id),
  constraint b2b_contact_unlocks_no_self check (unlocker_profile_id <> target_profile_id)
);

create index b2b_contact_unlocks_target_idx on public.b2b_contact_unlocks (target_profile_id);

-- ----------------------------------------------------------------------------
-- unlock_b2b_contact: sprawdza po kolei — czy już odblokowane wcześniej,
-- czy jest aktywny abonament (wtedy za darmo), w innym wypadku pobiera 20€
-- z portfela VakGulden, tak samo bezpiecznie jak w KROKU 6.
-- ----------------------------------------------------------------------------
create or replace function public.unlock_b2b_contact(p_target_profile_id uuid)
returns public.b2b_contact_unlocks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unlocker_id uuid := auth.uid();
  v_price numeric(6,2) := 20.00;
  v_balance numeric;
  v_tx_id uuid;
  v_existing public.b2b_contact_unlocks;
  v_result public.b2b_contact_unlocks;
  v_has_subscription boolean;
begin
  if v_unlocker_id = p_target_profile_id then
    raise exception 'Nie można odblokować własnego profilu';
  end if;

  if not exists (select 1 from public.b2b_profiles where profile_id = v_unlocker_id) then
    raise exception 'Tylko profil z segmentu B2B może odblokować kontakt w tym segmencie';
  end if;
  if not exists (select 1 from public.b2b_profiles where profile_id = p_target_profile_id) then
    raise exception 'Docelowy profil B2B nie istnieje';
  end if;

  select * into v_existing
  from public.b2b_contact_unlocks
  where unlocker_profile_id = v_unlocker_id and target_profile_id = p_target_profile_id;

  if found then
    return v_existing;
  end if;

  select exists(
    select 1 from public.b2b_subscriptions
    where profile_id = v_unlocker_id and status = 'active' and expires_at > now()
  ) into v_has_subscription;

  if v_has_subscription then
    insert into public.b2b_contact_unlocks (unlocker_profile_id, target_profile_id, price, unlock_via)
    values (v_unlocker_id, p_target_profile_id, 0, 'subscription')
    returning * into v_result;
    return v_result;
  end if;

  select balance into v_balance from public.wallets where profile_id = v_unlocker_id for update;
  if v_balance is null or v_balance < v_price then
    raise exception 'Niewystarczające środki VakGuldenów (saldo: %, wymagane: %)', coalesce(v_balance, 0), v_price;
  end if;

  update public.wallets set balance = balance - v_price where profile_id = v_unlocker_id;

  insert into public.wallet_transactions (profile_id, amount, type, reference_table, description)
  values (v_unlocker_id, -v_price, 'contact_unlock', 'b2b_contact_unlocks',
          'Odblokowanie kontaktu B2B do profilu ' || p_target_profile_id)
  returning id into v_tx_id;

  insert into public.b2b_contact_unlocks (unlocker_profile_id, target_profile_id, price, unlock_via, wallet_transaction_id)
  values (v_unlocker_id, p_target_profile_id, v_price, 'one_time', v_tx_id)
  returning * into v_result;

  return v_result;
end;
$$;

-- ----------------------------------------------------------------------------
-- start_b2b_subscription: kupuje 30-dniowy abonament nielimitowanych
-- odblokowań kontaktów w B2B (50€), pobierając środki z portfela VakGulden.
-- ----------------------------------------------------------------------------
create or replace function public.start_b2b_subscription()
returns public.b2b_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_price numeric(6,2) := 50.00;
  v_balance numeric;
  v_tx_id uuid;
  v_result public.b2b_subscriptions;
begin
  if not exists (select 1 from public.b2b_profiles where profile_id = v_profile_id) then
    raise exception 'Tylko profil z segmentu B2B może wykupić abonament';
  end if;
  if exists (
    select 1 from public.b2b_subscriptions
    where profile_id = v_profile_id and status = 'active' and expires_at > now()
  ) then
    raise exception 'Masz już aktywny abonament B2B';
  end if;

  select balance into v_balance from public.wallets where profile_id = v_profile_id for update;
  if v_balance is null or v_balance < v_price then
    raise exception 'Niewystarczające środki VakGuldenów (saldo: %, wymagane: %)', coalesce(v_balance, 0), v_price;
  end if;

  update public.wallets set balance = balance - v_price where profile_id = v_profile_id;

  insert into public.wallet_transactions (profile_id, amount, type, reference_table, description)
  values (v_profile_id, -v_price, 'contact_unlock', 'b2b_subscriptions', 'Abonament B2B — 30 dni nielimitowanych kontaktów')
  returning id into v_tx_id;

  insert into public.b2b_subscriptions (profile_id, price, started_at, expires_at, wallet_transaction_id)
  values (v_profile_id, v_price, now(), now() + interval '30 days', v_tx_id)
  returning * into v_result;

  return v_result;
end;
$$;
