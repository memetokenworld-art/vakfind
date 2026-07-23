-- ============================================================================
-- KROK 8: Opinie powiązane z realnym kontaktem
-- ============================================================================
-- Najważniejsza zasada z dokumentów: opinię można wystawić WYŁĄCZNIE, jeśli
-- w systemie istnieje rzeczywisty, opłacony rekord odblokowania kontaktu
-- (order_contact_unlocks z KROKU 6) między tym klientem a tym fachowcem dla
-- tego zlecenia. To fizycznie uniemożliwia kupowanie/fałszowanie opinii —
-- nie da się jej dodać bez śladu prawdziwej transakcji w bazie.
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  professional_id uuid not null references public.professional_profiles(profile_id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  professional_response text,
  created_at timestamptz not null default now()
);

create index reviews_professional_idx on public.reviews (professional_id);

-- ----------------------------------------------------------------------------
-- Walidacja przy dodawaniu opinii: zlecenie musi być zakończone, opiniujący
-- musi być właścicielem zlecenia, oceniany fachowiec musi być tym samym,
-- który był przypisany do zlecenia, i musi istnieć jego opłacone
-- odblokowanie kontaktu do tego zlecenia.
-- ----------------------------------------------------------------------------
create or replace function public.enforce_review_integrity()
returns trigger
language plpgsql
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = new.order_id;

  if v_order.status <> 'completed' then
    raise exception 'Opinię można wystawić tylko dla zakończonego zlecenia';
  end if;
  if v_order.client_id <> new.client_id then
    raise exception 'Tylko klient, który wystawił zlecenie, może dodać opinię';
  end if;
  if v_order.assigned_professional_id is distinct from new.professional_id then
    raise exception 'Oceniany fachowiec musi być tym przypisanym do zlecenia';
  end if;
  if not exists (
    select 1 from public.order_contact_unlocks u
    where u.order_id = new.order_id and u.professional_id = new.professional_id
  ) then
    raise exception 'Brak potwierdzonego, realnego kontaktu (odblokowania) dla tego zlecenia';
  end if;

  return new;
end;
$$;

create trigger reviews_enforce_integrity
  before insert on public.reviews
  for each row execute function public.enforce_review_integrity();

-- Po dodaniu opinii fachowiec może dopisać tylko odpowiedź, klient może
-- edytować tylko ocenę/komentarz — pilnowane na poziomie pola, bo RLS
-- (KROK 10) działa tylko na poziomie całych wierszy.
create or replace function public.enforce_review_update_permissions()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() = old.professional_id then
    if new.rating is distinct from old.rating
       or new.comment is distinct from old.comment
       or new.client_id is distinct from old.client_id
       or new.professional_id is distinct from old.professional_id
       or new.order_id is distinct from old.order_id then
      raise exception 'Fachowiec może edytować tylko odpowiedź na opinię';
    end if;
  elsif auth.uid() = old.client_id then
    if new.professional_response is distinct from old.professional_response then
      raise exception 'Tylko fachowiec może edytować odpowiedź na opinię';
    end if;
  else
    raise exception 'Brak uprawnień do edycji tej opinii';
  end if;
  return new;
end;
$$;

create trigger reviews_enforce_update_permissions
  before update on public.reviews
  for each row execute function public.enforce_review_update_permissions();

-- ----------------------------------------------------------------------------
-- Po każdej zmianie opinii przeliczamy średnią ocenę i licznik opinii
-- fachowca, a to z kolei (przez trigger BEFORE z KROKU 3) automatycznie
-- przelicza cały VakScore.
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER: opinię wystawia KLIENT, ale ten trigger musi zaktualizować
-- WIERSZ FACHOWCA w professional_profiles — bez podwyższonych uprawnień RLS
-- (professional_profiles_update_own) po cichu zablokowałby ten UPDATE (0 wierszy
-- zmienionych, bez błędu), bo auth.uid() to klient, a nie właściciel profilu.
create or replace function public.recalculate_review_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_professional_id uuid := coalesce(new.professional_id, old.professional_id);
  v_avg numeric;
  v_count integer;
begin
  select avg(rating), count(*) into v_avg, v_count
  from public.reviews where professional_id = v_professional_id;

  update public.professional_profiles
  set review_avg_rating = coalesce(round(v_avg, 2), 0),
      review_count = coalesce(v_count, 0)
  where profile_id = v_professional_id;

  return coalesce(new, old);
end;
$$;

create trigger reviews_recalculate_stats
  after insert or update or delete on public.reviews
  for each row execute function public.recalculate_review_stats();
