-- ============================================================================
-- KROK 18: Nowa kategoria — Systeemplafonds (sufity podwieszane/systemowe)
-- ============================================================================
-- Dodatek do planu (sekcja 7). seed.sql uruchamia się tylko przy
-- "supabase db reset" — na już wdrożonej bazie trzeba dopisać tę kategorię
-- osobną migracją, tak samo jak resztę zmian w tej sesji.
insert into public.categories (name, name_pl, slug, parent_id)
select 'Systeemplafonds', 'Sufity podwieszane/systemowe', 'systeemplafonds', c.id
from public.categories c
where c.slug = 'afwerking-interieur'
on conflict (slug) do nothing;

insert into public.category_synonyms (category_id, synonym, language)
select c.id, s.synonym, s.language
from public.categories c
join (values
  ('systeemplafonds', 'systeemplafond', 'nl'),
  ('systeemplafonds', 'verlaagd plafond', 'nl'),
  ('systeemplafonds', 'plafondmontage', 'nl'),
  ('systeemplafonds', 'plafondplaten', 'nl'),
  ('systeemplafonds', 'plafondprofielen', 'nl'),
  ('systeemplafonds', 'akoestisch plafond', 'nl'),
  ('systeemplafonds', 'zwevend plafond', 'nl')
) as s(slug, synonym, language) on s.slug = c.slug
on conflict (category_id, synonym, language) do nothing;
