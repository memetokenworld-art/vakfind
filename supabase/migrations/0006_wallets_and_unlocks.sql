-- ============================================================================
-- KROK 6: VakGuldeny (portfel), system odblokowywania kontaktów (1€/5€)
-- ============================================================================
-- Portfel (public.wallets) powstał już w KROKU 2 (tworzony automatycznie
-- przy każdej rejestracji). Tu dodajemy: historię ruchów na portfelu,
-- dwie tabele odblokowań (klient->fachowiec i fachowiec->zlecenie klienta —
-- to DWIE różne ścieżki z różną ceną i różnym skutkiem) oraz funkcje, które
-- bezpiecznie wykonują całą operację płatności za jednym razem.

-- ----------------------------------------------------------------------------
-- Księga (ledger) VakGuldenów — każdy ruch na portfelu to jeden wiersz.
-- Dzięki temu saldo (wallets.balance) da się zawsze odtworzyć/zweryfikować
-- z historii, a automatyczny zwrot przy sporze (punkt 4 specyfikacji) ma
-- na czym się oprzeć.
-- ----------------------------------------------------------------------------
create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null,  -- dodatnia = wpływ, ujemna = wypływ
  type public.wallet_transaction_type not null,
  reference_table text,           -- np. 'order_contact_unlocks', do audytu
  reference_id uuid,
  description text,
  created_at timestamptz not null default now()
);

create index wallet_transactions_profile_idx on public.wallet_transactions (profile_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Odblokowanie kontaktu KLIENT -> FACHOWIEC (1€).
-- Klient przegląda profile fachowców (niekoniecznie w kontekście
-- konkretnego zlecenia) i płaci raz za zawsze, żeby zobaczyć jego telefon/
-- email. "unique" niżej gwarantuje, że druga wizyta na ten sam profil nie
-- każe płacić drugi raz (ochrona przed podwójną płatnością, punkt 2).
-- ----------------------------------------------------------------------------
create table public.professional_contact_unlocks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  professional_id uuid not null references public.professional_profiles(profile_id) on delete cascade,
  price numeric(4,2) not null default 1.00,
  wallet_transaction_id uuid references public.wallet_transactions(id),
  unlocked_at timestamptz not null default now(),
  constraint professional_contact_unlocks_unique unique (client_id, professional_id)
);

create index professional_contact_unlocks_professional_idx on public.professional_contact_unlocks (professional_id);

-- ----------------------------------------------------------------------------
-- Odblokowanie kontaktu FACHOWIEC -> ZLECENIE KLIENTA (5€).
-- To odblokowanie dodatkowo uruchamia zmianę statusu zlecenia na
-- "W realizacji" (patrz funkcja unlock_order_contact niżej).
-- ----------------------------------------------------------------------------
create table public.order_contact_unlocks (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  professional_id uuid not null references public.professional_profiles(profile_id) on delete cascade,
  price numeric(4,2) not null default 5.00,
  wallet_transaction_id uuid references public.wallet_transactions(id),
  unlocked_at timestamptz not null default now(),
  -- Wypełniane, jeśli zlecenie zamknięto bez odpowiedzi klienta i fachowcowi
  -- automatycznie oddano VakGuldeny (punkt 4 — zwrot bez zgłaszania).
  refunded_at timestamptz,
  refund_wallet_transaction_id uuid references public.wallet_transactions(id),
  constraint order_contact_unlocks_unique unique (order_id, professional_id)
);

create index order_contact_unlocks_professional_idx on public.order_contact_unlocks (professional_id);
create index order_contact_unlocks_order_idx on public.order_contact_unlocks (order_id);

-- ----------------------------------------------------------------------------
-- unlock_professional_contact: pojedyncza, bezpieczna funkcja wykonująca
-- całą operację płatności za jednym razem (sprawdzenie salda, obciążenie
-- portfela, zapis w księdze, zapis odblokowania). SECURITY DEFINER + ustalona
-- na sztywno cena (1.00) w kodzie funkcji — cena NIE jest przyjmowana jako
-- parametr od klienta, żeby nikt nie mógł jej podmienić z poziomu przeglądarki.
-- ----------------------------------------------------------------------------
create or replace function public.unlock_professional_contact(p_professional_id uuid)
returns public.professional_contact_unlocks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid := auth.uid();
  v_price numeric(4,2) := 1.00;
  v_balance numeric;
  v_tx_id uuid;
  v_existing public.professional_contact_unlocks;
  v_result public.professional_contact_unlocks;
begin
  select * into v_existing
  from public.professional_contact_unlocks
  where client_id = v_client_id and professional_id = p_professional_id;

  if found then
    return v_existing; -- już opłacone wcześniej, nie pobieramy drugi raz
  end if;

  if not exists (select 1 from public.profiles where id = v_client_id and account_type = 'client') then
    raise exception 'Tylko konto typu client może odblokować kontakt do fachowca';
  end if;

  select balance into v_balance from public.wallets where profile_id = v_client_id for update;
  if v_balance is null or v_balance < v_price then
    raise exception 'Niewystarczające środki VakGuldenów (saldo: %, wymagane: %)', coalesce(v_balance, 0), v_price;
  end if;

  update public.wallets set balance = balance - v_price where profile_id = v_client_id;

  insert into public.wallet_transactions (profile_id, amount, type, reference_table, description)
  values (v_client_id, -v_price, 'contact_unlock', 'professional_contact_unlocks',
          'Odblokowanie kontaktu do fachowca ' || p_professional_id)
  returning id into v_tx_id;

  insert into public.professional_contact_unlocks (client_id, professional_id, price, wallet_transaction_id)
  values (v_client_id, p_professional_id, v_price, v_tx_id)
  returning * into v_result;

  return v_result;
end;
$$;

-- ----------------------------------------------------------------------------
-- unlock_order_contact: odpowiednik powyższej funkcji dla strony fachowca
-- (5€ za kontakt do klienta z konkretnego zlecenia). Dodatkowo:
--   - blokuje odblokowanie, jeśli zlecenie nie jest już "active" (ochrona
--     przed płaceniem za zajęte zlecenie, punkt 2/problem B)
--   - przy pierwszym odblokowaniu automatycznie ustawia status "in_progress"
--     na 3 dni i przypisuje fachowca do zlecenia
-- ----------------------------------------------------------------------------
create or replace function public.unlock_order_contact(p_order_id uuid)
returns public.order_contact_unlocks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_professional_id uuid := auth.uid();
  v_price numeric(4,2) := 5.00;
  v_balance numeric;
  v_tx_id uuid;
  v_order public.orders;
  v_existing public.order_contact_unlocks;
  v_result public.order_contact_unlocks;
begin
  select * into v_existing
  from public.order_contact_unlocks
  where order_id = p_order_id and professional_id = v_professional_id;

  if found then
    return v_existing; -- już opłacone wcześniej, nie pobieramy drugi raz
  end if;

  if not exists (select 1 from public.professional_profiles where profile_id = v_professional_id) then
    raise exception 'Tylko konto typu professional może odblokować kontakt do zlecenia';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Zlecenie % nie istnieje', p_order_id;
  end if;
  if v_order.status <> 'active' then
    raise exception 'Zlecenie nie jest już aktywne (status: %) — kontakt mógł już odblokować inny fachowiec', v_order.status;
  end if;

  select balance into v_balance from public.wallets where profile_id = v_professional_id for update;
  if v_balance is null or v_balance < v_price then
    raise exception 'Niewystarczające środki VakGuldenów (saldo: %, wymagane: %)', coalesce(v_balance, 0), v_price;
  end if;

  update public.wallets set balance = balance - v_price where profile_id = v_professional_id;

  insert into public.wallet_transactions (profile_id, amount, type, reference_table, description)
  values (v_professional_id, -v_price, 'contact_unlock', 'order_contact_unlocks',
          'Odblokowanie kontaktu do zlecenia ' || p_order_id)
  returning id into v_tx_id;

  insert into public.order_contact_unlocks (order_id, professional_id, price, wallet_transaction_id)
  values (p_order_id, v_professional_id, v_price, v_tx_id)
  returning * into v_result;

  update public.orders
  set status = 'in_progress',
      in_progress_started_at = now(),
      in_progress_expires_at = now() + interval '3 days',
      assigned_professional_id = v_professional_id
  where id = p_order_id;

  update public.professional_profiles
  set unlocked_orders_count = unlocked_orders_count + 1
  where profile_id = v_professional_id;

  return v_result;
end;
$$;

-- ----------------------------------------------------------------------------
-- Ręczne działania klienta na własnym zleceniu.
-- ----------------------------------------------------------------------------
create or replace function public.reopen_order(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id and client_id = auth.uid();
  if not found then
    raise exception 'Zlecenie nie istnieje albo nie należy do Ciebie';
  end if;
  if v_order.status <> 'in_progress' then
    raise exception 'Można ponownie otworzyć tylko zlecenie w statusie "W realizacji"';
  end if;

  update public.orders
  set status = 'active',
      in_progress_started_at = null,
      in_progress_expires_at = null
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

create or replace function public.complete_order(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id and client_id = auth.uid();
  if not found then
    raise exception 'Zlecenie nie istnieje albo nie należy do Ciebie';
  end if;

  update public.orders
  set status = 'completed',
      completed_at = now()
  where id = p_order_id
  returning * into v_order;

  if v_order.assigned_professional_id is not null then
    update public.professional_profiles
    set completed_orders_count = completed_orders_count + 1
    where profile_id = v_order.assigned_professional_id;
  end if;

  return v_order;
end;
$$;

-- ----------------------------------------------------------------------------
-- Automatyczne zamykanie "zawieszonych" zleceń po 3 dniach bez reakcji
-- klienta + automatyczny zwrot VakGuldenów fachowcowi, który zapłacił za
-- kontakt (punkt 4 — zwrot bez konieczności zgłaszania). Funkcja wołana
-- cyklicznie przez harmonogram (np. pg_cron co godzinę), nie przez
-- użytkownika bezpośrednio.
-- ----------------------------------------------------------------------------
create or replace function public.close_stale_in_progress_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_count integer := 0;
  v_unlock public.order_contact_unlocks;
  v_tx_id uuid;
begin
  for v_order in
    select * from public.orders
    where status = 'in_progress' and in_progress_expires_at < now()
  loop
    update public.orders
    set status = 'closed', closed_reason = 'no_client_response'
    where id = v_order.id;

    for v_unlock in
      select * from public.order_contact_unlocks
      where order_id = v_order.id and refunded_at is null
    loop
      insert into public.wallet_transactions (profile_id, amount, type, reference_table, reference_id, description)
      values (v_unlock.professional_id, v_unlock.price, 'refund', 'order_contact_unlocks', v_unlock.id,
              'Automatyczny zwrot VakGulden — brak odpowiedzi klienta na zlecenie ' || v_order.id)
      returning id into v_tx_id;

      update public.wallets
      set balance = balance + v_unlock.price
      where profile_id = v_unlock.professional_id;

      update public.order_contact_unlocks
      set refunded_at = now(), refund_wallet_transaction_id = v_tx_id
      where id = v_unlock.id;
    end loop;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;
