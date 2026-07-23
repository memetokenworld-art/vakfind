-- ============================================================================
-- KROK 7: Prawdziwe płatności w EUR (iDEAL / karta) — doładowania portfela
-- ============================================================================
-- VakGuldeny (KROK 6) to wewnętrzna waluta rozliczeniowa. Realne pieniądze
-- wchodzą do systemu tylko tutaj: użytkownik płaci przez zewnętrznego
-- dostawcę płatności (iDEAL jako główna metoda w NL, karta dodatkowo),
-- a po potwierdzeniu (webhook dostawcy) portfel zostaje doładowany.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10,2) not null,
  currency text not null default 'EUR',
  provider text not null default 'mollie',   -- Mollie obsługuje natywnie iDEAL
  provider_payment_id text,
  status public.payment_status not null default 'pending',
  purpose public.payment_purpose not null,
  wallet_transaction_id uuid references public.wallet_transactions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_profile_idx on public.payments (profile_id);
create unique index payments_provider_payment_unique
  on public.payments (provider, provider_payment_id)
  where provider_payment_id is not null;

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- confirm_payment: wołane przez backend PO otrzymaniu potwierdzenia od
-- dostawcy płatności (webhook), NIE bezpośrednio przez użytkownika w
-- przeglądarce — dlatego brak polityki RLS pozwalającej zwykłym kontom
-- wywołać tę funkcję (patrz KROK 10, backend łączy się kluczem service_role,
-- który i tak omija RLS).
-- ----------------------------------------------------------------------------
create or replace function public.confirm_payment(p_payment_id uuid)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments;
  v_tx_id uuid;
begin
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Płatność % nie istnieje', p_payment_id;
  end if;
  if v_payment.status = 'paid' then
    return v_payment; -- już przetworzona, nie doładowujemy drugi raz
  end if;

  update public.payments set status = 'paid' where id = p_payment_id;

  if v_payment.purpose = 'wallet_topup' then
    insert into public.wallet_transactions (profile_id, amount, type, reference_table, reference_id, description)
    values (v_payment.profile_id, v_payment.amount, 'topup', 'payments', v_payment.id, 'Doładowanie portfela VakGulden')
    returning id into v_tx_id;

    update public.wallets set balance = balance + v_payment.amount where profile_id = v_payment.profile_id;

    update public.payments set wallet_transaction_id = v_tx_id where id = p_payment_id;
  end if;

  select * into v_payment from public.payments where id = p_payment_id;
  return v_payment;
end;
$$;
