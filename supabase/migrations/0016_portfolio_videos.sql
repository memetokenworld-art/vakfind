-- ============================================================================
-- KROK 16: Filmiki portfolio (freemium: 3 za darmo, 1 min/filmik max)
-- ============================================================================
-- Zwykły Supabase Storage (nie Cloudflare Stream/Mux) — plan sam zaznaczał
-- to jako otwarty wybór do rozważenia "przy skalowaniu"; na start prostszy,
-- już działający mechanizm (te same zasady co portfolio-photos w KROKU 13)
-- wystarcza i nie wymaga nowej integracji zewnętrznej.
create table public.professional_portfolio_videos (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professional_profiles(profile_id) on delete cascade,
  video_url text not null,
  caption text,
  duration_seconds integer,
  moderation_status public.moderation_status not null default 'pending',
  reported_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index portfolio_videos_professional_idx on public.professional_portfolio_videos (professional_id);
create index portfolio_videos_moderation_idx on public.professional_portfolio_videos (moderation_status);

alter table public.professional_portfolio_videos enable row level security;

create policy "portfolio_videos_select_approved_or_own" on public.professional_portfolio_videos
  for select using (moderation_status = 'approved' or auth.uid() = professional_id);

create policy "portfolio_videos_manage_own" on public.professional_portfolio_videos
  for insert with check (auth.uid() = professional_id);

create policy "portfolio_videos_delete_own" on public.professional_portfolio_videos
  for delete using (auth.uid() = professional_id);

insert into storage.buckets (id, name, public)
values ('portfolio-videos', 'portfolio-videos', true)
on conflict (id) do nothing;

create policy "portfolio_videos_public_read" on storage.objects
  for select using (bucket_id = 'portfolio-videos');

create policy "portfolio_videos_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'portfolio-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "portfolio_videos_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'portfolio-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
