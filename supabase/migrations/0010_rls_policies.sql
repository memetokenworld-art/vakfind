-- ============================================================================
-- KROK 10: Row Level Security — kto co widzi i może zmieniać
-- ============================================================================
-- Supabase wystawia bazę danych bezpośrednio do aplikacji frontendowej
-- (przez klucz "anon"), więc reguły bezpieczeństwa MUSZĄ być zapisane w
-- samej bazie, a nie tylko w kodzie aplikacji — inaczej każdy mógłby np.
-- odczytać cudzy numer telefonu bezpośrednio z API Supabase. RLS
-- ("Row Level Security") to reguły "kto widzi/zmienia który WIERSZ".
--
-- Konto "service_role" (używane tylko przez backend, nigdy w przeglądarce)
-- zawsze omija RLS całkowicie — używamy go m.in. do potwierdzania płatności
-- (webhook Mollie) i do zadań cyklicznych (zamykanie zaległych zleceń).

alter table public.profiles enable row level security;
alter table public.profile_contacts enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.professional_profiles enable row level security;
alter table public.professional_portfolio_photos enable row level security;
alter table public.professional_certificates enable row level security;
alter table public.categories enable row level security;
alter table public.category_synonyms enable row level security;
alter table public.professional_categories enable row level security;
alter table public.orders enable row level security;
alter table public.order_status_log enable row level security;
alter table public.professional_contact_unlocks enable row level security;
alter table public.order_contact_unlocks enable row level security;
alter table public.payments enable row level security;
alter table public.reviews enable row level security;
alter table public.b2b_profiles enable row level security;
alter table public.b2b_profile_categories enable row level security;
alter table public.b2b_subscriptions enable row level security;
alter table public.b2b_contact_unlocks enable row level security;
-- order_reminder_log: brak polityk = dostępne tylko dla service_role (tabela
-- czysto techniczna dla harmonogramu wysyłki e-maili, nikt z frontu jej nie czyta)
alter table public.order_reminder_log enable row level security;

-- ---------------------------------------------------------------- profiles
create policy "profiles_select_public" on public.profiles
  for select using (true);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- --------------------------------------------------------- profile_contacts
-- Serce systemu odblokowywania kontaktów: telefon/email widoczny dla
-- właściciela ORAZ dla każdego, kto ma zapisane w bazie opłacone
-- odblokowanie (profil fachowca -> klient płacący 1€, zlecenie -> fachowiec
-- płacący 5€).
create policy "profile_contacts_select_own" on public.profile_contacts
  for select using (auth.uid() = profile_id);

create policy "profile_contacts_select_via_professional_unlock" on public.profile_contacts
  for select using (
    exists (
      select 1 from public.professional_contact_unlocks u
      where u.professional_id = profile_contacts.profile_id and u.client_id = auth.uid()
    )
  );

create policy "profile_contacts_select_via_order_unlock" on public.profile_contacts
  for select using (
    exists (
      select 1
      from public.order_contact_unlocks u
      join public.orders o on o.id = u.order_id
      where o.client_id = profile_contacts.profile_id and u.professional_id = auth.uid()
    )
  );

create policy "profile_contacts_select_via_b2b_unlock" on public.profile_contacts
  for select using (
    exists (
      select 1 from public.b2b_contact_unlocks u
      where u.target_profile_id = profile_contacts.profile_id and u.unlocker_profile_id = auth.uid()
    )
  );

create policy "profile_contacts_insert_own" on public.profile_contacts
  for insert with check (auth.uid() = profile_id);

create policy "profile_contacts_update_own" on public.profile_contacts
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ------------------------------------------------------------------ wallets
-- Brak polityk insert/update dla zwykłych kont — saldo zmieniają wyłącznie
-- funkcje SECURITY DEFINER (unlock_*, confirm_payment), nigdy bezpośredni
-- zapis z przeglądarki.
create policy "wallets_select_own" on public.wallets
  for select using (auth.uid() = profile_id);

create policy "wallet_transactions_select_own" on public.wallet_transactions
  for select using (auth.uid() = profile_id);

-- ------------------------------------------------------ professional_profiles
create policy "professional_profiles_select_public" on public.professional_profiles
  for select using (true);

create policy "professional_profiles_insert_own" on public.professional_profiles
  for insert with check (auth.uid() = profile_id);

create policy "professional_profiles_update_own" on public.professional_profiles
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "portfolio_photos_select_approved_or_own" on public.professional_portfolio_photos
  for select using (moderation_status = 'approved' or professional_id = auth.uid());

create policy "portfolio_photos_manage_own" on public.professional_portfolio_photos
  for insert with check (professional_id = auth.uid());

create policy "portfolio_photos_delete_own" on public.professional_portfolio_photos
  for delete using (professional_id = auth.uid());

create policy "certificates_select_all" on public.professional_certificates
  for select using (true);

create policy "certificates_manage_own" on public.professional_certificates
  for insert with check (professional_id = auth.uid());

create policy "certificates_delete_own" on public.professional_certificates
  for delete using (professional_id = auth.uid());

-- --------------------------------------------------------------- categories
create policy "categories_select_all" on public.categories for select using (true);
create policy "category_synonyms_select_all" on public.category_synonyms for select using (true);

create policy "professional_categories_select_all" on public.professional_categories
  for select using (true);

create policy "professional_categories_manage_own" on public.professional_categories
  for insert with check (professional_id = auth.uid());

create policy "professional_categories_delete_own" on public.professional_categories
  for delete using (professional_id = auth.uid());

-- ------------------------------------------------------------------- orders
create policy "orders_select_own_client" on public.orders
  for select using (auth.uid() = client_id);

create policy "orders_select_assigned_professional" on public.orders
  for select using (auth.uid() = assigned_professional_id);

-- Fachowcy przeglądają aktywne zlecenia. UWAGA: ta polityka ujawnia CAŁY
-- wiersz łącznie z full_address przez bezpośrednie zapytania do tabeli
-- "orders" — dlatego aplikacja frontendowa MA używać widoku
-- "orders_public" poniżej do listowania/przeglądania zleceń, a nie tabeli
-- bazowej wprost. RLS działa na poziomie wiersza, nie kolumny.
create policy "orders_select_active_for_professionals" on public.orders
  for select using (
    status = 'active'
    and exists (select 1 from public.professional_profiles where profile_id = auth.uid())
  );

create policy "orders_insert_own_client" on public.orders
  for insert with check (auth.uid() = client_id);

create policy "orders_update_own_client" on public.orders
  for update using (auth.uid() = client_id) with check (auth.uid() = client_id);

-- ------------------------------------------------------------------- widok orders_public
-- Bezpieczny sposób przeglądania zleceń: full_address widoczny tylko dla
-- właściciela, przypisanego fachowca, albo fachowca z opłaconym
-- odblokowaniem tego zlecenia — dla wszystkich innych zwraca NULL.
-- "security_invoker = true" oznacza, że widok respektuje RLS bazowej
-- tabeli "orders" tak, jakby pytający sam ją odpytywał.
create view public.orders_public
  with (security_invoker = true) as
select
  o.id, o.client_id, o.category_id, o.title, o.description, o.status,
  o.budget_min, o.budget_max, o.city, o.postal_code, o.preferred_date,
  o.latitude, o.longitude,
  o.assigned_professional_id, o.created_at, o.updated_at, o.completed_at,
  case
    when auth.uid() = o.client_id then o.full_address
    when auth.uid() = o.assigned_professional_id then o.full_address
    when exists (
      select 1 from public.order_contact_unlocks u
      where u.order_id = o.id and u.professional_id = auth.uid()
    ) then o.full_address
    else null
  end as full_address
from public.orders o;

grant select on public.orders_public to authenticated, anon;

-- ------------------------------------------------------------ order_status_log
create policy "order_status_log_select_involved" on public.order_status_log
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_status_log.order_id
        and (o.client_id = auth.uid() or o.assigned_professional_id = auth.uid())
    )
  );

-- ------------------------------------------------------ professional_contact_unlocks
-- Brak polityki INSERT: jedyna droga to funkcja unlock_professional_contact()
-- (SECURITY DEFINER) z KROKU 6 — gwarantuje poprawne obciążenie portfela.
create policy "professional_contact_unlocks_select_own" on public.professional_contact_unlocks
  for select using (auth.uid() = client_id or auth.uid() = professional_id);

-- ------------------------------------------------------------- order_contact_unlocks
create policy "order_contact_unlocks_select_own_professional" on public.order_contact_unlocks
  for select using (auth.uid() = professional_id);

create policy "order_contact_unlocks_select_own_client" on public.order_contact_unlocks
  for select using (
    exists (select 1 from public.orders o where o.id = order_contact_unlocks.order_id and o.client_id = auth.uid())
  );

-- ------------------------------------------------------------------ payments
create policy "payments_select_own" on public.payments
  for select using (auth.uid() = profile_id);

create policy "payments_insert_own" on public.payments
  for insert with check (auth.uid() = profile_id);
-- status płatności zmienia wyłącznie confirm_payment() wołane przez backend
-- po webhooku dostawcy (service_role) — brak polityki UPDATE dla użytkowników

-- ------------------------------------------------------------------- reviews
create policy "reviews_select_all" on public.reviews
  for select using (true);

create policy "reviews_insert_own_client" on public.reviews
  for insert with check (auth.uid() = client_id);

create policy "reviews_update_own" on public.reviews
  for update
  using (auth.uid() = client_id or auth.uid() = professional_id)
  with check (auth.uid() = client_id or auth.uid() = professional_id);

-- ---------------------------------------------------------------- b2b_profiles
create policy "b2b_profiles_select_all" on public.b2b_profiles
  for select using (true);

create policy "b2b_profiles_insert_own" on public.b2b_profiles
  for insert with check (auth.uid() = profile_id);

create policy "b2b_profiles_update_own" on public.b2b_profiles
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "b2b_profile_categories_select_all" on public.b2b_profile_categories
  for select using (true);

create policy "b2b_profile_categories_manage_own" on public.b2b_profile_categories
  for insert with check (b2b_profile_id = auth.uid());

create policy "b2b_profile_categories_delete_own" on public.b2b_profile_categories
  for delete using (b2b_profile_id = auth.uid());

create policy "b2b_subscriptions_select_own" on public.b2b_subscriptions
  for select using (auth.uid() = profile_id);

create policy "b2b_contact_unlocks_select_own" on public.b2b_contact_unlocks
  for select using (auth.uid() = unlocker_profile_id or auth.uid() = target_profile_id);
