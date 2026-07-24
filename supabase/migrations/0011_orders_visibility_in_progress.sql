-- ============================================================================
-- KROK 11: Fachowcy widzą też zlecenia "W realizacji" (nie tylko Aktywne)
-- ============================================================================
-- Ekran 6 (widok fachowca przeglądającego zlecenia) pokazuje również już
-- zajęte zlecenia — wyszarzone, z etykietą "Niedostępne" — żeby fachowiec
-- widział transparentnie, że ktoś już odblokował kontakt (ochrona przed
-- płaceniem za zajęte zlecenie, punkt 2 specyfikacji). Bez tej reguły RLS
-- w ogóle by ich nie zobaczył. Dodajemy NOWĄ politykę zamiast zmieniać
-- istniejącą — reguły RLS się sumują (OR), więc to bezpieczne, nieniszczące
-- rozszerzenie.
create policy "orders_select_in_progress_for_professionals" on public.orders
  for select using (
    status = 'in_progress'
    and exists (select 1 from public.professional_profiles where profile_id = auth.uid())
  );
