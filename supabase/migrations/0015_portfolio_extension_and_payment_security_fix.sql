-- ============================================================================
-- KROK 15a: Poprawka bezpieczeństwa — confirm_payment() był wołalny wprost
-- z przeglądarki
-- ============================================================================
-- Postgres domyślnie nadaje EXECUTE na każdą nową funkcję roli PUBLIC —
-- migracja 0010 dodała RLS blokujący bezpośredni UPDATE tabeli payments
-- przez użytkownika, ale nic nie blokowało wywołania samej funkcji
-- confirm_payment() (SECURITY DEFINER, więc wewnątrz i tak omija RLS).
-- Efekt: zalogowany użytkownik mógł sobie sam utworzyć pending płatność
-- (to dozwolone, "payments_insert_own") i od razu wywołać
-- supabase.rpc('confirm_payment', {...}) z konsoli przeglądarki, doładowując
-- portfel bez faktycznej wpłaty przez Mollie. Funkcja jest pomyślana jako
-- "tylko backend po webhooku" (patrz komentarz w KROKU 7) — teraz to
-- egzekwujemy na poziomie uprawnień, nie tylko w komentarzu.
revoke execute on function public.confirm_payment(uuid) from public;
grant execute on function public.confirm_payment(uuid) to service_role;

-- ============================================================================
-- KROK 15b: Płatne rozszerzenie portfolio (10€/miesiąc → 30 zdjęć + 10 filmików)
-- ============================================================================
-- Osobne tabele (nie payment_purpose enum na płatnościach) — dodawanie
-- nowej wartości do istniejącego enuma (ALTER TYPE ... ADD VALUE) nie może
-- być bezpiecznie użyte w tej samej transakcji co jej użycie, a wklejenie
-- całego pliku w Supabase SQL Editor wykonuje się jako jedna transakcja.
-- Osobna tabela zamówień omija ten problem i trzyma tę funkcję biznesową
-- (przedłużanie limitu, nie doładowanie portfela) osobno od reszty płatności.
create table public.portfolio_extensions (
  professional_id uuid primary key references public.professional_profiles(profile_id) on delete cascade,
  active boolean not null default false,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

create trigger portfolio_extensions_set_updated_at
  before update on public.portfolio_extensions
  for each row execute function public.set_updated_at();

create table public.portfolio_extension_orders (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professional_profiles(profile_id) on delete cascade,
  price numeric(6,2) not null default 10.00,
  provider_payment_id text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  created_at timestamptz not null default now()
);

create index portfolio_extension_orders_professional_idx
  on public.portfolio_extension_orders (professional_id);
create unique index portfolio_extension_orders_provider_payment_unique
  on public.portfolio_extension_orders (provider_payment_id)
  where provider_payment_id is not null;

alter table public.portfolio_extensions enable row level security;
alter table public.portfolio_extension_orders enable row level security;

create policy "portfolio_extensions_select_own" on public.portfolio_extensions
  for select using (auth.uid() = professional_id);
-- Brak polityki insert/update: jedyna droga zapisu to
-- confirm_portfolio_extension_order() niżej (SECURITY DEFINER, tylko backend).

create policy "portfolio_extension_orders_select_own" on public.portfolio_extension_orders
  for select using (auth.uid() = professional_id);

create policy "portfolio_extension_orders_insert_own" on public.portfolio_extension_orders
  for insert with check (auth.uid() = professional_id);
-- Status zmienia wyłącznie confirm_portfolio_extension_order() po webhooku.

-- ----------------------------------------------------------------------------
-- confirm_portfolio_extension_order: wołane WYŁĄCZNIE przez backend
-- (service_role, webhook Mollie) po potwierdzeniu płatności — tak samo
-- zabezpieczone jak confirm_payment powyżej. Przedłuża o 30 dni od
-- aktualnego wygaśnięcia (jeśli jeszcze aktywne) albo od teraz.
-- ----------------------------------------------------------------------------
create or replace function public.confirm_portfolio_extension_order(p_order_id uuid)
returns public.portfolio_extensions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.portfolio_extension_orders;
  v_current_expiry timestamptz;
  v_result public.portfolio_extensions;
begin
  select * into v_order from public.portfolio_extension_orders where id = p_order_id for update;
  if not found then
    raise exception 'Bestelling % bestaat niet', p_order_id;
  end if;

  if v_order.status = 'paid' then
    select * into v_result from public.portfolio_extensions where professional_id = v_order.professional_id;
    return v_result;
  end if;

  update public.portfolio_extension_orders set status = 'paid' where id = p_order_id;

  select expires_at into v_current_expiry
  from public.portfolio_extensions
  where professional_id = v_order.professional_id;

  insert into public.portfolio_extensions (professional_id, active, expires_at)
  values (v_order.professional_id, true, greatest(coalesce(v_current_expiry, now()), now()) + interval '30 days')
  on conflict (professional_id) do update
    set active = true,
        expires_at = greatest(coalesce(public.portfolio_extensions.expires_at, now()), now()) + interval '30 days'
  returning * into v_result;

  return v_result;
end;
$$;

revoke execute on function public.confirm_portfolio_extension_order(uuid) from public;
grant execute on function public.confirm_portfolio_extension_order(uuid) to service_role;
