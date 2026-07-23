-- ============================================================================
-- KROK 5: Zlecenia (orders) i ich cykl życia — Aktywne / W realizacji / Zakończone
-- ============================================================================
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id),

  title text not null,
  description text not null,
  status public.order_status not null default 'active',

  budget_min numeric(10,2),
  budget_max numeric(10,2),

  city text not null,
  postal_code text not null,
  -- Pełny adres — CELOWO trzymany osobno od city/postal_code. city/postal_code
  -- są publiczne (potrzebne fachowcom do oceny "czy to blisko"), full_address
  -- ma być widoczny dopiero PO opłaceniu odblokowania kontaktu (patrz widok
  -- orders_public w KROKU 10 z regułami bezpieczeństwa RLS).
  full_address text,
  latitude double precision,
  longitude double precision,

  preferred_date date,

  -- Fachowiec przypisany do zlecenia. FK do professional_profiles (nie do
  -- profiles) automatycznie gwarantuje, że to konto typu "professional" —
  -- baza danych fizycznie nie pozwoli przypisać tu konta klienta.
  assigned_professional_id uuid references public.professional_profiles(profile_id) on delete set null,

  -- --- Pola cyklu życia "W realizacji" (3 dni od pierwszego odblokowania) ---
  in_progress_started_at timestamptz,
  in_progress_expires_at timestamptz,
  closed_reason public.order_closed_reason,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,

  constraint orders_budget_check check (budget_max is null or budget_min is null or budget_max >= budget_min)
);

create index orders_status_idx on public.orders (status);
create index orders_category_idx on public.orders (category_id);
create index orders_client_idx on public.orders (client_id);
create index orders_city_idx on public.orders (city);
create index orders_in_progress_expiry_idx on public.orders (in_progress_expires_at) where status = 'in_progress';
create index orders_location_idx on public.orders
  using gist (ll_to_earth(latitude, longitude))
  where latitude is not null and longitude is not null;

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- Tylko konto typu "client" może wystawiać zlecenia — wymuszone triggerem,
-- bo orders.client_id musi wskazywać ogólną tabelę profiles (żeby dało się
-- też np. w przyszłości dodać recenzje/kontakty), więc nie da się tego
-- wymusić samym kluczem obcym jak w przypadku assigned_professional_id.
create or replace function public.enforce_order_client_role()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = new.client_id and p.account_type = 'client'
  ) then
    raise exception 'client_id % nie jest kontem typu client', new.client_id;
  end if;
  return new;
end;
$$;

create trigger orders_enforce_client_role
  before insert or update of client_id on public.orders
  for each row execute function public.enforce_order_client_role();

-- ----------------------------------------------------------------------------
-- Historia zmian statusu — czysty, ustrukturyzowany log każdej zmiany.
-- Nie jest to "ładny dodatek": to właśnie ten rodzaj danych ma pozwolić
-- przyszłemu AI Managerowi (patrz zasada przewodnia dokumentów) analizować
-- zlecenia bez przebudowy bazy — np. "ile zleceń zamyka się automatycznie
-- z powodu braku odpowiedzi klienta".
-- ----------------------------------------------------------------------------
create table public.order_status_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  old_status public.order_status,
  new_status public.order_status not null,
  changed_by uuid references public.profiles(id),
  reason text,
  created_at timestamptz not null default now()
);

create index order_status_log_order_idx on public.order_status_log (order_id, created_at desc);

-- SECURITY DEFINER: order_status_log ma w KROKU 10 tylko politykę SELECT
-- (to czysty log audytowy, nikt nie wstawia do niego ręcznie) — trigger
-- musi więc pisać z podwyższonymi uprawnieniami niezależnie od tego, kto
-- (klient czy fachowiec) spowodował zmianę statusu.
create or replace function public.log_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    insert into public.order_status_log (order_id, old_status, new_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger orders_log_status_change
  after update of status on public.orders
  for each row execute function public.log_order_status_change();

-- ----------------------------------------------------------------------------
-- Przypomnienia e-mail w dniach 1/2/3 statusu "W realizacji" (punkt 3).
-- Osobna tabela zamiast pola na orders, bo mają być DOKŁADNIE trzy
-- przypomnienia i trzeba pilnować, żeby żadne nie wysłało się dwa razy
-- (unique poniżej) — wysyłkę wykonuje zewnętrzny harmonogram (np. pg_cron
-- lub cron aplikacji), ta tabela to tylko log/zabezpieczenie idempotencji.
-- ----------------------------------------------------------------------------
create table public.order_reminder_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  reminder_day smallint not null check (reminder_day in (1, 2, 3)),
  sent_at timestamptz not null default now(),
  constraint order_reminder_log_unique unique (order_id, reminder_day)
);
