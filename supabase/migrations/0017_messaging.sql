-- ============================================================================
-- KROK 17: Wiadomości (punkt 5 priorytetu z planu)
-- ============================================================================
-- Świadomy zakres: wątek otwiera się DOPIERO po opłaconym odblokowaniu
-- kontaktu (klient->fachowiec ZA 1€, albo fachowiec->zlecenie klienta za
-- 5€) — tak samo jak telefon/e-mail/WhatsApp/social media (KROK 14).
-- Bez tego ograniczenia wiadomości byłyby furtką do darmowej wymiany
-- namiarów przed zapłatą, dokładnie to, przed czym ostrzegał Mariusz przy
-- social media. RLS "insert" na conversations poniżej to egzekwuje wprost
-- w bazie (sprawdza istnienie odblokowania), nie tylko w UI.
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  professional_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  constraint conversations_unique_pair unique (client_id, professional_id)
);

create index conversations_client_idx on public.conversations (client_id, last_message_at desc);
create index conversations_professional_idx on public.conversations (professional_id, last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) > 0),
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- Houdt last_message_at bij zonder dat elke lijst-query de messages-tabel
-- moet aggregeren (gesprekkenlijst sorteert op recente activiteit).
create or replace function public.touch_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation_last_message();

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "conversations_select_own" on public.conversations
  for select using (auth.uid() = client_id or auth.uid() = professional_id);

create policy "conversations_insert_if_unlocked" on public.conversations
  for insert with check (
    (auth.uid() = client_id or auth.uid() = professional_id)
    and (
      exists (
        select 1 from public.professional_contact_unlocks u
        where u.client_id = conversations.client_id
          and u.professional_id = conversations.professional_id
      )
      or exists (
        select 1 from public.order_contact_unlocks u
        join public.orders o on o.id = u.order_id
        where o.client_id = conversations.client_id
          and u.professional_id = conversations.professional_id
      )
    )
  );

create policy "messages_select_own_conversation" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.client_id = auth.uid() or c.professional_id = auth.uid())
    )
  );

create policy "messages_insert_own_conversation" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.client_id = auth.uid() or c.professional_id = auth.uid())
    )
  );
