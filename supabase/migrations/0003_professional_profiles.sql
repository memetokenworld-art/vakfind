-- ============================================================================
-- KROK 3: Profil fachowca — KvK, VakScore, kompletność profilu
-- ============================================================================
-- Zgodnie z ustaleniami: rejestracja fachowca wymaga obowiązkowego minimum
-- (numer KvK + imię/nazwisko + email — imię i email już są w profiles/
-- profile_contacts), a wszystko poniżej jest opcjonalne, ale buduje
-- VakScore i pasek kompletności profilu.
--
-- Pola są rozbite pojedynczo (has_own_tools, reads_technical_drawings,
-- years_of_experience...) zamiast jednego wspólnego opisu tekstowego —
-- to świadoma decyzja zgodna z zasadą przewodnią z dokumentów: przyszły
-- AI Manager ma się móc "podłączyć" do konkretnych, nazwanych pól bez
-- przebudowy bazy (np. wygenerować podpowiedź "uzupełnij lata
-- doświadczenia" patrząc na jedno konkretne pole, a nie parsując tekst).
create table public.professional_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,

  -- --- Numer KvK i jego weryfikacja przez oficjalne API rejestru firm NL ---
  kvk_number text not null,
  kvk_company_name text,              -- nazwa zwrócona przez API KvK
  kvk_verification_status public.kvk_verification_status not null default 'unverified',
  kvk_verified_at timestamptz,
  kvk_verification_raw jsonb,         -- surowa odpowiedź API, do audytu/AI

  -- --- Składowe VakScore i kompletności profilu (patrz punkt 7a) ---
  bio text,                                     -- opis firmy
  years_of_experience smallint,                 -- lata doświadczenia W BRANŻY
                                                 -- (celowo osobno od "czasu na VakFind")
  has_own_tools boolean not null default false, -- sygnał autentycznego ZZP (pkt 20)
  tools_description text,
  reads_technical_drawings boolean not null default false,
  team_size smallint,                           -- wielkość zespołu
  service_radius_km smallint not null default 10,
  hourly_rate_min numeric(10,2),
  hourly_rate_max numeric(10,2),
  has_liability_insurance boolean not null default false, -- aansprakelijkheidsverzekering

  -- --- Wynik VakScore (0-100), przechowywany jako gotowa wartość, żeby nie
  -- liczyć go w locie przy każdym wyszukiwaniu. Przeliczany triggerami
  -- w kolejnych krokach (opinie -> KROK 8, kompletność -> koniec tego pliku).
  vak_score numeric(5,2) not null default 0 check (vak_score between 0 and 100),
  review_avg_rating numeric(3,2) not null default 0 check (review_avg_rating between 0 and 5),
  review_count integer not null default 0,
  completed_orders_count integer not null default 0,
  unlocked_orders_count integer not null default 0,   -- licznik aktywności z pkt 7g
  profile_completeness smallint not null default 0 check (profile_completeness between 0 and 100),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint professional_profiles_kvk_unique unique (kvk_number)
);

create index professional_profiles_vak_score_idx on public.professional_profiles (vak_score desc);
create index professional_profiles_kvk_status_idx on public.professional_profiles (kvk_verification_status);

create trigger professional_profiles_set_updated_at
  before update on public.professional_profiles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Zdjęcia realizacji (portfolio) — jeden z czynników VakScore/kompletności,
-- z obowiązkową moderacją przed publikacją (automatyczna, np. Google Cloud
-- Vision SafeSearch, + ręczne zgłoszenia użytkowników — pkt 7f).
-- ----------------------------------------------------------------------------
create table public.professional_portfolio_photos (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professional_profiles(profile_id) on delete cascade,
  photo_url text not null,
  caption text,
  moderation_status public.moderation_status not null default 'pending',
  reported_count integer not null default 0,   -- ile razy kliknięto "zgłoś zdjęcie"
  created_at timestamptz not null default now()
);

create index portfolio_photos_professional_idx on public.professional_portfolio_photos (professional_id);
create index portfolio_photos_moderation_idx on public.professional_portfolio_photos (moderation_status);

-- ----------------------------------------------------------------------------
-- Certyfikaty (np. VCA) — kolejny czynnik VakScore/kompletności
-- ----------------------------------------------------------------------------
create table public.professional_certificates (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professional_profiles(profile_id) on delete cascade,
  name text not null,
  issued_by text,
  file_url text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index certificates_professional_idx on public.professional_certificates (professional_id);

-- ----------------------------------------------------------------------------
-- Obliczanie wskaźnika kompletności profilu (0-100).
--
-- Wagi są na razie ustalone "na sztywno" w kodzie funkcji — celowo w jednym,
-- łatwym do znalezienia miejscu, żeby można je było łatwo dostroić później
-- (albo docelowo przekazać AI Managerowi jako dane wejściowe zamiast twardej
-- reguły — patrz zasada przewodnia, punkt 0/9 specyfikacji).
-- ----------------------------------------------------------------------------
-- Funkcja przyjmuje CAŁY WIERSZ (nie tylko id), żeby dało się ją bezpiecznie
-- wywołać z triggera BEFORE INSERT/UPDATE na professional_profiles — w takim
-- triggerze wiersz NEW jeszcze nie jest zapisany w tabeli, więc dociąganie
-- go z powrotem przez "select ... where profile_id = ..." by nic nie znalazło.
create or replace function public.calculate_profile_completeness(p_row public.professional_profiles)
returns smallint
language plpgsql
stable
as $$
declare
  v_score smallint := 0;
  v_has_photo boolean;
  v_has_certificate boolean;
  v_has_category boolean;
begin
  select exists(
    select 1 from public.professional_portfolio_photos
    where professional_id = p_row.profile_id and moderation_status = 'approved'
  ) into v_has_photo;

  select exists(
    select 1 from public.professional_certificates where professional_id = p_row.profile_id
  ) into v_has_certificate;

  select exists(
    select 1 from public.professional_categories where professional_id = p_row.profile_id
  ) into v_has_category;

  if p_row.bio is not null and length(p_row.bio) > 20 then v_score := v_score + 15; end if;
  if p_row.years_of_experience is not null then v_score := v_score + 10; end if;
  if p_row.kvk_verification_status = 'verified' then v_score := v_score + 20; end if;
  if v_has_photo then v_score := v_score + 20; end if;
  if v_has_certificate then v_score := v_score + 10; end if;
  if v_has_category then v_score := v_score + 15; end if;
  if p_row.has_own_tools then v_score := v_score + 5; end if;
  if p_row.reads_technical_drawings then v_score := v_score + 5; end if;

  return least(v_score, 100);
end;
$$;

-- ----------------------------------------------------------------------------
-- Obliczanie VakScore (0-100) — jeden łączny wskaźnik jakości fachowca
-- (punkt 4 wizji / 7a specyfikacji). Trzy składowe: opinie (waga
-- największa), aktywność (chroni nowych, dobrych fachowców bez opinii),
-- kompletność profilu. Jeśli fachowiec nie ma jeszcze żadnej opinii, waga
-- opinii jest rozdzielana na pozostałe dwie składowe, żeby nowe konto nie
-- startowało sztucznie nisko. Wagi są parametrem tej jednej funkcji —
-- świadomie łatwe do znalezienia i przestrojenia w jednym miejscu.
-- ----------------------------------------------------------------------------
create or replace function public.calculate_vak_score(
  p_completeness smallint,
  p_review_avg numeric,
  p_review_count integer,
  p_completed_orders integer,
  p_unlocked_orders integer
)
returns numeric
language plpgsql
immutable
as $$
declare
  v_review_component numeric;      -- 0-100
  v_activity_component numeric;    -- 0-100
  v_completeness_component numeric := p_completeness; -- już 0-100
  v_score numeric;
begin
  v_review_component := (p_review_avg / 5.0) * 100;
  v_activity_component := least(p_completed_orders * 8 + p_unlocked_orders * 3, 100);

  if p_review_count = 0 then
    v_score := v_activity_component * 0.5 + v_completeness_component * 0.5;
  else
    v_score := v_review_component * 0.6 + v_activity_component * 0.2 + v_completeness_component * 0.2;
  end if;

  return round(least(greatest(v_score, 0), 100), 2);
end;
$$;

-- ----------------------------------------------------------------------------
-- Trigger BEFORE INSERT/UPDATE: przelicza profile_completeness i vak_score
-- WPROST W WIERSZU (NEW.*), bez żadnego dodatkowego UPDATE na tej samej
-- tabeli. To celowy wybór architektoniczny — trigger AFTER UPDATE, który
-- sam wykonuje "update professional_profiles ..." na TEJ SAMEJ tabeli,
-- wywołałby sam siebie w nieskończoność. BEFORE + modyfikacja NEW jest
-- bezpieczne i nie ma tego problemu.
-- ----------------------------------------------------------------------------
create or replace function public.professional_profiles_before_save()
returns trigger
language plpgsql
as $$
declare
  v_completeness smallint;
begin
  v_completeness := public.calculate_profile_completeness(new);
  new.profile_completeness := v_completeness;
  new.vak_score := public.calculate_vak_score(
    v_completeness, new.review_avg_rating, new.review_count,
    new.completed_orders_count, new.unlocked_orders_count
  );
  return new;
end;
$$;

create trigger professional_profiles_before_save
  before insert or update on public.professional_profiles
  for each row execute function public.professional_profiles_before_save();

-- ----------------------------------------------------------------------------
-- "Dotknięcie" profilu fachowca z tabel powiązanych (zdjęcia, certyfikaty,
-- kategorie — KROK 4 — oraz opinie — KROK 8). Same w sobie nic nie liczą:
-- wykonują jeden UPDATE na professional_profiles, który uruchamia powyższy
-- trigger BEFORE i przelicza wszystko od nowa na podstawie aktualnego stanu.
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER: np. przyszła ręczna moderacja może zmienić
-- moderation_status cudzego zdjęcia (moderator, nie sam fachowiec) — bez
-- podwyższonych uprawnień RLS zablokowałby ten UPDATE, bo auth.uid() w takiej
-- sytuacji nie byłby właścicielem profilu (professional_profiles_update_own).
create or replace function public.touch_professional_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_professional_id uuid;
begin
  v_professional_id := coalesce(new.professional_id, old.professional_id);
  update public.professional_profiles set updated_at = now() where profile_id = v_professional_id;
  return coalesce(new, old);
end;
$$;

create trigger portfolio_photos_touch_profile
  after insert or update or delete on public.professional_portfolio_photos
  for each row execute function public.touch_professional_profile();

create trigger certificates_touch_profile
  after insert or delete on public.professional_certificates
  for each row execute function public.touch_professional_profile();
