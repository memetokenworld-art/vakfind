-- ============================================================================
-- KROK 14: WhatsApp, strona WWW i social media — WSZYSTKO chronione tak
-- samo jak telefon/email
-- ============================================================================
-- Świadoma korekta: strona WWW czy Facebook/Instagram/LinkedIn to też
-- ścieżki bezpośredniego kontaktu z pominięciem platformy (klient znalazłby
-- tam telefon/email fachowca za darmo) — więc trafiają do profile_contacts,
-- NIE do professional_profiles. Ten sam mechanizm odblokowania (RLS z
-- KROKU 10) chroni je wszystkie naraz.
alter table public.profile_contacts
  add column if not exists whatsapp_number text,
  add column if not exists website_url text,
  add column if not exists facebook_url text,
  add column if not exists instagram_url text,
  add column if not exists linkedin_url text;
