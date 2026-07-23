-- ============================================================================
-- KROK 1: Rozszerzenia PostgreSQL i typy wyliczeniowe (enum)
-- ============================================================================
-- Rozszerzenia dodają PostgreSQL-owi funkcje, których nie ma domyślnie:
--   pgcrypto      -> generowanie bezpiecznych identyfikatorów UUID
--   pg_trgm       -> wyszukiwanie "podobnych" fraz (literówki, odmiany słów)
--   unaccent      -> wyszukiwanie ignorujące znaki diakrytyczne
--   cube + earthdistance -> liczenie odległości w km między współrzędnymi
--                            geograficznymi (potrzebne do "promień X km")
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";
create extension if not exists "unaccent";
create extension if not exists "cube";
create extension if not exists "earthdistance";

-- Typy kont: klient vs fachowiec (VakFind ma dwie zupełnie różne ścieżki
-- rejestracji i różne pola profilu dla każdej z nich)
create type public.account_type as enum ('client', 'professional');

-- Cykl życia zlecenia (dokładnie te 3 nazwy z ustaleń roboczych + jeden stan
-- techniczny "closed" na automatyczne/ręczne zamknięcie bez realizacji)
create type public.order_status as enum ('active', 'in_progress', 'completed', 'closed');

-- Dlaczego zlecenie zostało zamknięte bez statusu "completed" — ważne dla
-- automatycznego zwrotu VakGuldenów i dla przyszłego AI Managera (żeby
-- odróżnić "klient załatwił sprawę poza platformą" od "klient po prostu
-- zniknął i trzeba było automatycznie zamknąć ogłoszenie")
create type public.order_closed_reason as enum ('no_client_response', 'client_cancelled', 'other');

-- Status weryfikacji numeru KvK (rejestr firm w Holandii) przez oficjalne API
create type public.kvk_verification_status as enum ('unverified', 'pending', 'verified', 'rejected');

-- Rodzaje ruchów na portfelu VakGulden (wewnętrzna waluta platformy)
create type public.wallet_transaction_type as enum ('topup', 'contact_unlock', 'refund', 'bonus', 'adjustment');

-- Status prawdziwej płatności w EUR (iDEAL / karta)
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type public.payment_purpose as enum ('wallet_topup', 'contact_unlock_direct', 'b2b_unlock', 'b2b_subscription');

-- Status moderacji zdjęć (portfolio realizacji, certyfikaty, banery w przyszłości)
create type public.moderation_status as enum ('pending', 'approved', 'rejected');

-- Rola profilu w segmencie B2B (punkt 19 specyfikacji): ZZP szukający
-- projektów, albo firma szukająca podwykonawcy — kontakt odblokowuje się
-- symetrycznie w obie strony, ale trzeba wiedzieć "kto jest kim" na liście
create type public.b2b_role as enum ('zzp_seeking_work', 'company_seeking_contractor');

-- Prosta, generyczna funkcja pomocnicza: automatycznie ustawia updated_at
-- na "teraz" przy każdej zmianie wiersza. Używana przez wiele tabel poniżej.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
