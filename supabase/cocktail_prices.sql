-- ============================================================
-- À exécuter dans Supabase → SQL Editor
-- Crée la table des prix cocktail et la peuple avec les prix de référence
-- Prix en euros par centilitre (€/cl)
-- Tu peux modifier les prix directement dans la table Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS cocktail_ingredient_prices (
  key      TEXT PRIMARY KEY,
  label    TEXT NOT NULL,
  price_cl NUMERIC(8,4) NOT NULL
);

ALTER TABLE cocktail_ingredient_prices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'cocktail_ingredient_prices' AND policyname = 'read_cocktail_prices'
  ) THEN
    CREATE POLICY read_cocktail_prices ON cocktail_ingredient_prices
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

INSERT INTO cocktail_ingredient_prices (key, label, price_cl) VALUES
-- ── Spiritueux de base (bouteille 70 cl) ──────────────────────────
('rhum_blanc',        'Rhum blanc',                   0.1857),
('rhum_ambre',        'Rhum ambré',                   0.2143),
('rhum_brun',         'Rhum brun',                    0.2286),
('rhum_brun_jamaique','Rhum brun jamaïcain',           0.3857),
('rhum_jamaique_ambre','Rhum jamaïcain ambré',          0.3143),
('rhum_cubain',       'Rhum cubain',                  0.2286),
('rhum_overproof',    'Rhum overproof',               0.2571),
('rhum_epice',        'Rhum épicé',                   0.2143),
('cachaca',           'Cachaça',                      0.2857),
('vodka',             'Vodka',                        0.1714),
('gin',               'Gin London Dry',               0.2571),
('gin_contemp',       'Gin contemporain',             0.3571),
('tequila_blanche',   'Tequila blanche',              0.3143),
('tequila_reposado',  'Tequila reposado',             0.4000),
('mezcal',            'Mezcal',                       0.5000),
('whisky',            'Whisky écossais',              0.3143),
('scotch',            'Scotch',                       0.3143),
('irish_whiskey',     'Irish Whiskey',                0.3143),
('whisky_japonais',   'Whisky japonais',              0.5714),
('bourbon',           'Bourbon américain',            0.3143),
('rye',               'Rye whiskey',                  0.3571),
('cognac',            'Cognac',                       0.5000),
('cognac_vsop',       'Cognac VSOP',                  0.6000),
('calvados',          'Calvados',                     0.4286),
('pisco',             'Pisco',                        0.3571),
('brandy',            'Brandy',                       0.2143),
-- ── Liqueurs (bouteille 70 cl) ────────────────────────────────────
('cointreau',         'Cointreau',                    0.3571),
('triple_sec',        'Triple Sec',                   0.1714),
('grand_marnier',     'Grand Marnier',                0.4000),
('amaretto',          'Amaretto',                     0.2571),
('kahlua',            'Kahlúa',                       0.2857),
('liqueur_cafe',      'Liqueur de café',              0.2143),
('baileys',           'Baileys',                      0.2571),
('limoncello',        'Limoncello',                   0.2143),
('maraschino',        'Maraschino Luxardo',           0.3571),
('chartreuse_verte',  'Chartreuse verte',             0.5000),
('chartreuse_jaune',  'Chartreuse jaune',             0.4571),
('st_germain',        'St-Germain',                   0.4000),
('creme_cassis',      'Crème de cassis',              0.1429),
('creme_mure',        'Crème de mûre',                0.1429),
('creme_menthe',      'Crème de menthe',              0.1429),
('creme_cacao_blanc', 'Crème de cacao blanche',       0.1714),
('creme_cacao_brun',  'Crème de cacao brune',         0.1714),
('creme_violette',    'Crème de violette',            0.2857),
('apricot_brandy',    'Apricot Brandy',               0.2571),
('midori',            'Midori',                       0.2857),
('curacao_bleu',      'Curaçao bleu',                 0.2143),
('malibu',            'Malibu',                       0.2143),
('passoa',            'Passoã',                       0.2286),
('southern_comfort',  'Southern Comfort',             0.2571),
('drambuie',          'Drambuie',                     0.4000),
('benedictine',       'Bénédictine',                  0.4286),
('licor_43',          'Licor 43',                     0.2857),
('jagermeister',      'Jägermeister',                 0.2571),
('absinthe',          'Absinthe',                     0.4286),
('absinthe_rouge',    'Absinthe rouge',               0.4286),
('frangelico',        'Frangelico',                   0.3143),
('allspice_dram',     'Allspice Dram',                0.3571),
('creme_banane',      'Crème de banane',              0.1714),
('creme_coco_liq',    'Crème de noix de coco',        0.2143),
('galliano',          'Galliano',                     0.3143),
('chambord',          'Chambord',                     0.4286),
('pimms',             'Pimm''s No.1',                 0.2286),
('punsch',            'Punsch',                       0.3143),
('manzana',           'Manzana',                      0.2143),
-- ── Vin & Vermouth (bouteille 75 cl) ─────────────────────────────
('champagne',         'Champagne',                    0.2667),
('prosecco',          'Prosecco',                     0.1333),
('vin_blanc',         'Vin blanc sec',                0.0667),
('vin_rouge',         'Vin rouge',                    0.0667),
('vermouth_dry',      'Vermouth dry',                 0.1333),
('vermouth_rouge',    'Vermouth rouge',               0.1333),
('porto',             'Porto rouge',                  0.1600),
('sherry',            'Sherry',                       0.1600),
-- ── Bière & Cidre ─────────────────────────────────────────────────
('biere_blonde',      'Bière blonde',                 0.0606),
('biere_brune',       'Bière brune',                  0.0758),
('ginger_beer',       'Ginger beer',                  0.0758),
('cidre',             'Cidre',                        0.0400),
-- ── Amers & Bitter ────────────────────────────────────────────────
('angostura',         'Angostura bitters',            0.7500),
('peychauds',         'Peychaud''s bitters',          1.2000),
('peach_bitters',     'Peach Bitters',                0.7500),
('orange_bitters',    'Orange bitters',               0.7500),
('campari',           'Campari',                      0.2571),
('aperol',            'Aperol',                       0.2286),
('suze',              'Suze',                         0.2857),
('pastis',            'Pastis',                       0.2143),
('ricard',            'Ricard',                       0.2143),
('amaro_montenegro',  'Amaro Montenegro',             0.3143),
('amaro_nonino',      'Amaro Nonino',                 0.5000),
('fernet',            'Fernet-Branca',                0.3571),
-- ── Sirops (bouteille 1 L) ────────────────────────────────────────
('sirop_sucre',       'Sirop de sucre',               0.0400),
('canadou',           'Canadou',                      0.0300),
('sirop_agave',       'Sirop d''agave',               0.0400),
('grenadine',         'Grenadine',                    0.0300),
('sirop_orgeat',      'Sirop d''orgeat',              0.0500),
('falernum',          'Falernum',                     0.2143),
('sirop_passion',     'Sirop de fruit de la passion', 0.0600),
('sirop_peche',       'Sirop de pêche',               0.0500),
('sirop_framboise',   'Sirop de framboise',           0.0500),
('sirop_menthe',      'Sirop de menthe',              0.0400),
('sirop_vanille',     'Sirop de vanille',             0.0500),
('sirop_coco',        'Sirop de coco',                0.0500),
('sirop_cannelle',    'Sirop de cannelle',            0.0600),
('sirop_gingembre',   'Sirop de gingembre',           0.0600),
('miel',              'Miel',                         0.2286),
('sirop_erable',      'Sirop d''érable',              0.2000),
-- ── Jus & Purées (bouteille 1 L) ─────────────────────────────────
('jus_citron',        'Jus de citron frais',          0.0300),
('jus_citron_vert',   'Jus de citron vert',           0.0400),
('jus_orange',        'Jus d''orange',                0.0200),
('jus_ananas',        'Jus d''ananas',                0.0250),
('jus_cranberry',     'Jus de cranberry',             0.0300),
('jus_pamplemousse',  'Jus de pamplemousse',          0.0250),
('jus_passion',       'Jus de fruit de la passion',   0.0400),
('jus_mangue',        'Jus de mangue',                0.0300),
('jus_peche',         'Jus de pêche',                 0.0300),
('jus_pomme',         'Jus de pomme',                 0.0200),
('jus_tomate',        'Jus de tomate',                0.0200),
('jus_goyave',        'Jus de goyave',                0.0300),
('puree_peche',       'Purée de pêche blanche',       0.0600),
('puree_fraise',      'Purée de fraise',              0.0600),
('puree_framboise',   'Purée de framboise',           0.0600),
('puree_passion',     'Purée de passion',             0.0600),
-- ── Mixeurs & sodas ───────────────────────────────────────────────
('tonic',             'Tonic water',                  0.0200),
('eau_gazeuse',       'Eau gazeuse',                  0.0080),
('cola',              'Cola',                         0.0200),
('ginger_ale',        'Ginger ale',                   0.0200),
('limonade',          'Limonade',                     0.0150),
('soda_citron',       'Soda citron-lime',             0.0200),
('red_bull',          'Red Bull',                     0.0800),
('eau_coco',          'Eau de coco',                  0.0400),
('lait_coco',         'Lait de coco',                 0.0500),
-- ── Frigo & Placard (liquides) ────────────────────────────────────
('espresso',          'Espresso',                     0.1000),
('lait',              'Lait',                         0.0100),
('creme_fraiche',     'Crème fraîche',                0.0600),
-- ── Frigo & Placard (condiments, €/cl) ───────────────────────────
('worcestershire',    'Sauce Worcestershire',         0.1200),
('tabasco',           'Tabasco',                      0.6000),
-- ── Frigo & Placard (garnishes, €/pièce ou €/pincée) ─────────────
-- price_cl = coût par unité (1 pièce / 1 pincée / 1 tranche)
('noix_muscade',      'Noix de muscade',              0.0300),
('zeste_citron',      'Zeste de citron',              0.0300),
('menthe_fraiche',    'Menthe fraîche',               0.1000),
('tranche_pomme',     'Tranche de pomme',             0.0800),
('quartier_citron_vert', 'Quartier de citron vert',   0.0600),
('zeste_orange',      'Zeste d''orange',               0.0500),
('tranche_orange',    'Tranche d''orange',             0.0500),
('cerises_marasquin', 'Cerises Marasquin',            0.0800),
('olives',            'Olives vertes',                0.1500),
('poivre',            'Poivre',                       0.0500),
('sel_celeri',        'Sel de céleri',                0.0300),
('celeri',            'Branche de céleri',            0.1500)
ON CONFLICT (key) DO UPDATE SET price_cl = EXCLUDED.price_cl, label = EXCLUDED.label;
