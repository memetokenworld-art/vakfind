-- ============================================================================
-- KROK 12: Poprawka wag % kompletności profilu
-- ============================================================================
-- Nowy podział, dokładnie wg ustaleń: 20% bazowe za obowiązkowe dane
-- (KvK, imię i nazwisko, email — zawsze spełnione, bo wymagane przy
-- rejestracji), reszta (80%) za elementy opcjonalne: opis firmy (15),
-- lata doświadczenia (10), narzędzia (10), czytanie rysunków (10),
-- certyfikaty (15), zdjęcia realizacji (20). Usunięto z wzoru punkty za
-- zweryfikowany KvK przez API (ta funkcja jeszcze nie istnieje — nikt by
-- nigdy nie osiągnął 100%) i za wybrane kategorie usług (nie było w
-- ustaleniach).
create or replace function public.calculate_profile_completeness(p_row public.professional_profiles)
returns smallint
language plpgsql
stable
as $$
declare
  v_score smallint := 20;
  v_has_photo boolean;
  v_has_certificate boolean;
begin
  select exists(
    select 1 from public.professional_portfolio_photos
    where professional_id = p_row.profile_id and moderation_status = 'approved'
  ) into v_has_photo;

  select exists(
    select 1 from public.professional_certificates where professional_id = p_row.profile_id
  ) into v_has_certificate;

  if p_row.bio is not null and length(p_row.bio) > 20 then v_score := v_score + 15; end if;
  if p_row.years_of_experience is not null then v_score := v_score + 10; end if;
  if p_row.has_own_tools then v_score := v_score + 10; end if;
  if p_row.reads_technical_drawings then v_score := v_score + 10; end if;
  if v_has_certificate then v_score := v_score + 15; end if;
  if v_has_photo then v_score := v_score + 20; end if;

  return least(v_score, 100);
end;
$$;

-- Jednorazowe przeliczenie dla profili już istniejących w bazie — sama
-- podmiana funkcji nie cofa się i nie przelicza starych wierszy.
update public.professional_profiles set updated_at = now();
