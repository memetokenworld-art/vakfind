-- ============================================================================
-- KROK 13: Supabase Storage — zdjęcia realizacji i certyfikaty
-- ============================================================================
-- Dwa publiczne "kubełki" na pliki (public=true — łatwiej wyświetlać
-- zdjęcia bez podpisywanych linków; certyfikaty też publiczne na razie,
-- bo nie ma jeszcze panelu moderacji, który by je ukrywał do zatwierdzenia).
-- Konwencja ścieżki pliku: "{id_fachowca}/{nazwa_pliku}" — dzięki temu
-- reguły niżej mogą sprawdzić "czy to TWÓJ folder" przez
-- storage.foldername(name), bez osobnej tabeli uprawnień.
insert into storage.buckets (id, name, public)
values ('portfolio-photos', 'portfolio-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('certificates', 'certificates', true)
on conflict (id) do nothing;

create policy "portfolio_photos_public_read" on storage.objects
  for select using (bucket_id = 'portfolio-photos');

create policy "portfolio_photos_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'portfolio-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "portfolio_photos_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'portfolio-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "certificates_public_read" on storage.objects
  for select using (bucket_id = 'certificates');

create policy "certificates_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'certificates'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "certificates_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'certificates'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
