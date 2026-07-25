-- ============================================================================
-- Dane przykładowe (seed): kategorie i frazy wyszukiwania
-- ============================================================================
-- Źródło: vakfind-kategorie-i-frazy.md. Nazwy grup ("Installaties", "Bouw en
-- verbouwing"...) są moim tłumaczeniem referencyjnym na niderlandzki (język
-- interfejsu) — w dokumencie źródłowym nagłówki sekcji były po polsku, więc
-- warto je zweryfikować/dopracować przed publikacją.
--
-- Ten plik uruchamia się automatycznie przy "supabase db reset" — nie jest
-- częścią migracji (migracje opisują STRUKTURĘ, seed wypełnia ją przykładowymi
-- DANYMI, żeby dało się od razu przetestować wyszukiwarkę).

-- --- Grupy (kategorie nadrzędne) ---
insert into public.categories (name, name_pl, slug, parent_id) values
  ('Installaties', 'Instalacje', 'installaties', null),
  ('Bouw en verbouwing', 'Budowa i remonty', 'bouw-en-verbouwing', null),
  ('Afwerking interieur', 'Wykończenia wnętrz', 'afwerking-interieur', null),
  ('Tuin en buitenruimte', 'Ogród i zewnętrze', 'tuin-en-buitenruimte', null),
  ('Schoonmaak', 'Sprzątanie', 'schoonmaak', null),
  ('Reparaties en overig vakwerk', 'Naprawy i inne rzemiosło', 'reparaties-en-overig-vakwerk', null);

-- --- Instalacje ---
insert into public.categories (name, name_pl, slug, parent_id) values
  ('Loodgieter', 'Hydraulik', 'loodgieter', (select id from public.categories where slug = 'installaties')),
  ('Elektricien', 'Elektryk', 'elektricien', (select id from public.categories where slug = 'installaties')),
  ('CV-monteur', 'Serwisant ogrzewania', 'cv-monteur', (select id from public.categories where slug = 'installaties'));

-- --- Budowa i remonty ---
insert into public.categories (name, name_pl, slug, parent_id) values
  ('Aannemer', 'Firma budowlana / złota rączka', 'aannemer', (select id from public.categories where slug = 'bouw-en-verbouwing')),
  ('Timmerman', 'Stolarz', 'timmerman', (select id from public.categories where slug = 'bouw-en-verbouwing')),
  ('Dakdekker', 'Dekarz', 'dakdekker', (select id from public.categories where slug = 'bouw-en-verbouwing')),
  ('Stukadoor', 'Tynkarz', 'stukadoor', (select id from public.categories where slug = 'bouw-en-verbouwing')),
  ('Metselaar', 'Murarz', 'metselaar', (select id from public.categories where slug = 'bouw-en-verbouwing'));

-- --- Wykończenia wnętrz ---
insert into public.categories (name, name_pl, slug, parent_id) values
  ('Schilder', 'Malarz', 'schilder', (select id from public.categories where slug = 'afwerking-interieur')),
  ('Vloerlegger', 'Fachowiec od podłóg', 'vloerlegger', (select id from public.categories where slug = 'afwerking-interieur')),
  ('Behanger', 'Tapeciarz', 'behanger', (select id from public.categories where slug = 'afwerking-interieur')),
  ('Meubelmontage', 'Montaż mebli', 'meubelmontage', (select id from public.categories where slug = 'afwerking-interieur')),
  ('Systeemplafonds', 'Sufity podwieszane/systemowe', 'systeemplafonds', (select id from public.categories where slug = 'afwerking-interieur'));

-- --- Ogród i zewnętrze ---
insert into public.categories (name, name_pl, slug, parent_id) values
  ('Hovenier', 'Ogrodnik', 'hovenier', (select id from public.categories where slug = 'tuin-en-buitenruimte')),
  ('Bestrating', 'Brukarz', 'bestrating', (select id from public.categories where slug = 'tuin-en-buitenruimte')),
  ('Hekwerk', 'Ogrodzenia', 'hekwerk', (select id from public.categories where slug = 'tuin-en-buitenruimte'));

-- --- Sprzątanie ---
insert into public.categories (name, name_pl, slug, parent_id) values
  ('Schoonmaakbedrijf', 'Firma sprzątająca', 'schoonmaakbedrijf', (select id from public.categories where slug = 'schoonmaak'));

-- --- Naprawy i inne rzemiosło ---
insert into public.categories (name, name_pl, slug, parent_id) values
  ('Kleermaker', 'Krawiec', 'kleermaker', (select id from public.categories where slug = 'reparaties-en-overig-vakwerk')),
  ('Slotenmaker', 'Ślusarz', 'slotenmaker', (select id from public.categories where slug = 'reparaties-en-overig-vakwerk')),
  ('Witgoedreparatie', 'Naprawa AGD', 'witgoedreparatie', (select id from public.categories where slug = 'reparaties-en-overig-vakwerk')),
  ('Verhuisbedrijf', 'Firma przeprowadzkowa', 'verhuisbedrijf', (select id from public.categories where slug = 'reparaties-en-overig-vakwerk')),
  ('Klein onderhoud', 'Drobne naprawy domowe', 'klein-onderhoud', (select id from public.categories where slug = 'reparaties-en-overig-vakwerk'));

-- --- Synonimy / frazy wyszukiwania ---
insert into public.category_synonyms (category_id, synonym, language)
select c.id, s.synonym, s.language
from public.categories c
join (values
  ('loodgieter', 'loodgieter', 'nl'), ('loodgieter', 'lekkage', 'nl'), ('loodgieter', 'lekkende kraan', 'nl'),
  ('loodgieter', 'verstopping', 'nl'), ('loodgieter', 'verstopte afvoer', 'nl'), ('loodgieter', 'cv-ketel reparatie', 'nl'),
  ('loodgieter', 'boiler', 'nl'), ('loodgieter', 'sanitair', 'nl'), ('loodgieter', 'wc reparatie', 'nl'),
  ('loodgieter', 'leiding repareren', 'nl'), ('loodgieter', 'waterleiding', 'nl'),
  ('loodgieter', 'plumber', 'en'), ('loodgieter', 'leak', 'en'), ('loodgieter', 'clogged drain', 'en'), ('loodgieter', 'water heater', 'en'),

  ('elektricien', 'elektricien', 'nl'), ('elektricien', 'stroomstoring', 'nl'), ('elektricien', 'stopcontact', 'nl'),
  ('elektricien', 'groepenkast', 'nl'), ('elektricien', 'meterkast', 'nl'), ('elektricien', 'elektrische installatie', 'nl'),
  ('elektricien', 'zekering', 'nl'), ('elektricien', 'kortsluiting', 'nl'), ('elektricien', 'verlichting installeren', 'nl'),
  ('elektricien', 'electrician', 'en'), ('elektricien', 'power outage', 'en'), ('elektricien', 'fuse box', 'en'), ('elektricien', 'wiring', 'en'),

  ('cv-monteur', 'cv-ketel', 'nl'), ('cv-monteur', 'verwarming reparatie', 'nl'), ('cv-monteur', 'radiator', 'nl'),
  ('cv-monteur', 'vloerverwarming', 'nl'), ('cv-monteur', 'warmtepomp installatie', 'nl'), ('cv-monteur', 'onderhoud cv-ketel', 'nl'),
  ('cv-monteur', 'heating repair', 'en'), ('cv-monteur', 'boiler service', 'en'), ('cv-monteur', 'heat pump', 'en'),

  ('aannemer', 'aannemer', 'nl'), ('aannemer', 'verbouwing', 'nl'), ('aannemer', 'renovatie', 'nl'),
  ('aannemer', 'klusjesman', 'nl'), ('aannemer', 'verbouwen', 'nl'), ('aannemer', 'uitbouw', 'nl'),
  ('aannemer', 'dakkapel', 'nl'), ('aannemer', 'muur slopen', 'nl'),
  ('aannemer', 'contractor', 'en'), ('aannemer', 'renovation', 'en'), ('aannemer', 'handyman', 'en'),

  ('timmerman', 'timmerman', 'nl'), ('timmerman', 'houtwerk', 'nl'), ('timmerman', 'kozijnen', 'nl'),
  ('timmerman', 'deuren plaatsen', 'nl'), ('timmerman', 'trap bouwen', 'nl'), ('timmerman', 'maatwerk meubels', 'nl'),
  ('timmerman', 'houten vloer leggen', 'nl'),
  ('timmerman', 'carpenter', 'en'), ('timmerman', 'custom woodwork', 'en'),

  ('dakdekker', 'dakdekker', 'nl'), ('dakdekker', 'dak lekkage', 'nl'), ('dakdekker', 'dak repareren', 'nl'),
  ('dakdekker', 'dakbedekking', 'nl'), ('dakdekker', 'dakgoot', 'nl'), ('dakdekker', 'dakpannen vervangen', 'nl'),
  ('dakdekker', 'roofer', 'en'), ('dakdekker', 'roof leak', 'en'), ('dakdekker', 'gutter repair', 'en'),

  ('stukadoor', 'stukadoor', 'nl'), ('stukadoor', 'muren stucen', 'nl'), ('stukadoor', 'gipsplaten', 'nl'),
  ('stukadoor', 'wand afwerken', 'nl'), ('stukadoor', 'pleisterwerk', 'nl'), ('stukadoor', 'plasterer', 'en'),

  ('metselaar', 'metselaar', 'nl'), ('metselaar', 'muur metselen', 'nl'), ('metselaar', 'schoorsteen', 'nl'),
  ('metselaar', 'tuinmuur bouwen', 'nl'), ('metselaar', 'bricklayer', 'en'), ('metselaar', 'mason', 'en'),

  ('schilder', 'schilder', 'nl'), ('schilder', 'huis schilderen', 'nl'), ('schilder', 'muren verven', 'nl'),
  ('schilder', 'kozijnen schilderen', 'nl'), ('schilder', 'buitenschilderwerk', 'nl'), ('schilder', 'binnenschilderwerk', 'nl'),
  ('schilder', 'painter', 'en'), ('schilder', 'house painting', 'en'),

  ('vloerlegger', 'vloerlegger', 'nl'), ('vloerlegger', 'laminaat leggen', 'nl'), ('vloerlegger', 'parket leggen', 'nl'),
  ('vloerlegger', 'pvc-vloer', 'nl'), ('vloerlegger', 'tegels leggen', 'nl'), ('vloerlegger', 'vloertegels', 'nl'),
  ('vloerlegger', 'flooring installer', 'en'), ('vloerlegger', 'tile installer', 'en'),

  ('behanger', 'behanger', 'nl'), ('behanger', 'behang plakken', 'nl'), ('behanger', 'wandbekleding', 'nl'),

  ('meubelmontage', 'meubelmontage', 'nl'), ('meubelmontage', 'meubels monteren', 'nl'), ('meubelmontage', 'ikea montage', 'nl'),
  ('meubelmontage', 'kast in elkaar zetten', 'nl'), ('meubelmontage', 'bed opbouwen', 'nl'), ('meubelmontage', 'meubels in elkaar zetten', 'nl'),
  ('meubelmontage', 'furniture assembly', 'en'), ('meubelmontage', 'ikea assembly', 'en'),

  ('systeemplafonds', 'systeemplafond', 'nl'), ('systeemplafonds', 'verlaagd plafond', 'nl'),
  ('systeemplafonds', 'plafondmontage', 'nl'), ('systeemplafonds', 'plafondplaten', 'nl'),
  ('systeemplafonds', 'plafondprofielen', 'nl'), ('systeemplafonds', 'akoestisch plafond', 'nl'),
  ('systeemplafonds', 'zwevend plafond', 'nl'),

  ('hovenier', 'hovenier', 'nl'), ('hovenier', 'tuinman', 'nl'), ('hovenier', 'tuinonderhoud', 'nl'),
  ('hovenier', 'gras maaien', 'nl'), ('hovenier', 'heg snoeien', 'nl'), ('hovenier', 'tuin aanleggen', 'nl'), ('hovenier', 'bomen snoeien', 'nl'),
  ('hovenier', 'gardener', 'en'), ('hovenier', 'landscaping', 'en'), ('hovenier', 'lawn mowing', 'en'),

  ('bestrating', 'bestrating', 'nl'), ('bestrating', 'terras aanleggen', 'nl'), ('bestrating', 'oprit bestraten', 'nl'),
  ('bestrating', 'stoeptegels leggen', 'nl'), ('bestrating', 'paving', 'en'), ('bestrating', 'patio installation', 'en'),

  ('hekwerk', 'hekwerk plaatsen', 'nl'), ('hekwerk', 'schutting bouwen', 'nl'), ('hekwerk', 'tuinhek', 'nl'),
  ('hekwerk', 'fencing installation', 'en'),

  ('schoonmaakbedrijf', 'schoonmaakbedrijf', 'nl'), ('schoonmaakbedrijf', 'huis schoonmaken', 'nl'), ('schoonmaakbedrijf', 'kantoor schoonmaken', 'nl'),
  ('schoonmaakbedrijf', 'glazenwasser', 'nl'), ('schoonmaakbedrijf', 'ramen wassen', 'nl'), ('schoonmaakbedrijf', 'eindschoonmaak', 'nl'),
  ('schoonmaakbedrijf', 'verhuisschoonmaak', 'nl'),
  ('schoonmaakbedrijf', 'cleaning company', 'en'), ('schoonmaakbedrijf', 'window cleaner', 'en'), ('schoonmaakbedrijf', 'move-out cleaning', 'en'),

  ('kleermaker', 'kleermaker', 'nl'), ('kleermaker', 'naaister', 'nl'), ('kleermaker', 'kleding vermaken', 'nl'),
  ('kleermaker', 'rits repareren', 'nl'), ('kleermaker', 'zoom inkorten', 'nl'), ('kleermaker', 'gordijnen naaien', 'nl'),
  ('kleermaker', 'tailor', 'en'), ('kleermaker', 'seamstress', 'en'), ('kleermaker', 'clothing repair', 'en'),

  ('slotenmaker', 'slotenmaker', 'nl'), ('slotenmaker', 'buitengesloten', 'nl'), ('slotenmaker', 'slot vervangen', 'nl'),
  ('slotenmaker', 'deur openen zonder sleutel', 'nl'), ('slotenmaker', 'locksmith', 'en'), ('slotenmaker', 'lockout', 'en'),

  ('witgoedreparatie', 'wasmachine reparatie', 'nl'), ('witgoedreparatie', 'koelkast repareren', 'nl'),
  ('witgoedreparatie', 'vaatwasser kapot', 'nl'), ('witgoedreparatie', 'witgoed reparatie', 'nl'),
  ('witgoedreparatie', 'appliance repair', 'en'), ('witgoedreparatie', 'washing machine repair', 'en'),

  ('verhuisbedrijf', 'verhuizers', 'nl'), ('verhuisbedrijf', 'verhuisbedrijf', 'nl'), ('verhuisbedrijf', 'verhuizen', 'nl'),
  ('verhuisbedrijf', 'meubeltransport', 'nl'), ('verhuisbedrijf', 'movers', 'en'), ('verhuisbedrijf', 'moving company', 'en'),

  ('klein-onderhoud', 'klein onderhoud', 'nl'), ('klein-onderhoud', 'kleine reparatie', 'nl'), ('klein-onderhoud', 'meubel repareren', 'nl'),
  ('klein-onderhoud', 'krabpaal repareren', 'nl'), ('klein-onderhoud', 'huishoudelijke reparatie', 'nl'), ('klein-onderhoud', 'kapot meubelstuk', 'nl'),
  ('klein-onderhoud', 'klusje in huis', 'nl'),
  ('klein-onderhoud', 'minor repair', 'en'), ('klein-onderhoud', 'furniture repair', 'en'), ('klein-onderhoud', 'small household fix', 'en')
) as s(slug, synonym, language) on s.slug = c.slug;
