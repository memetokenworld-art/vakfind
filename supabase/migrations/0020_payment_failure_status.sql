-- ============================================================================
-- KROK 20: Nieudane/geannuleerde/verlopen betalingen ook echt vastleggen
-- ============================================================================
-- Tot nu toe reageerden de webhook en de terugkeerpagina alleen op status
-- "paid" — bij failed/canceled/expired gebeurde er niets, dus payments.status
-- bleef voor altijd op "pending" staan, ook als bij Mollie allang duidelijk
-- was dat het niet ging lukken. Geen invloed op het saldo (dat was altijd al
-- correct), maar wel een gat in onze eigen boekhouding.
--
-- public.payment_status (KROK 1) kent alleen 'pending' | 'paid' | 'failed' |
-- 'refunded' — geen aparte 'canceled'/'expired'. Die drie Mollie-statussen
-- worden hier bewust allemaal op 'failed' afgebeeld (het onderscheid tussen
-- "de klant heeft geannuleerd" en "de betaling is verlopen" is voor onze
-- boekhouding niet relevant — in beide gevallen: niet betaald).
create or replace function public.mark_payment_failed(p_payment_id uuid)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments;
begin
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Betaling % bestaat niet', p_payment_id;
  end if;

  if v_payment.status = 'paid' then
    return v_payment; -- al bevestigd als betaald, nooit overschrijven
  end if;

  update public.payments set status = 'failed' where id = p_payment_id;

  select * into v_payment from public.payments where id = p_payment_id;
  return v_payment;
end;
$$;

revoke execute on function public.mark_payment_failed(uuid) from public;
grant execute on function public.mark_payment_failed(uuid) to service_role;

-- Zelfde voor de portfolio-uitbreiding bestellingen (KROK 15) — 'failed'
-- stond daar al in de check constraint, dus geen schemawijziging nodig.
create or replace function public.mark_portfolio_extension_order_failed(p_order_id uuid)
returns public.portfolio_extension_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.portfolio_extension_orders;
begin
  select * into v_order from public.portfolio_extension_orders where id = p_order_id for update;
  if not found then
    raise exception 'Bestelling % bestaat niet', p_order_id;
  end if;

  if v_order.status = 'paid' then
    return v_order;
  end if;

  update public.portfolio_extension_orders set status = 'failed' where id = p_order_id;

  select * into v_order from public.portfolio_extension_orders where id = p_order_id;
  return v_order;
end;
$$;

revoke execute on function public.mark_portfolio_extension_order_failed(uuid) from public;
grant execute on function public.mark_portfolio_extension_order_failed(uuid) to service_role;
