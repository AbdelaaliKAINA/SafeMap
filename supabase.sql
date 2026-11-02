-- =========================================================================
-- SafeMap — schéma Supabase
-- À exécuter une fois dans Supabase : SQL Editor > New query > Run
-- =========================================================================

-- 1. Table des signalements
--    Les contraintes CHECK protègent la base même si quelqu'un contourne le formulaire.
create table if not exists public.signalements (
  id          uuid primary key default gen_random_uuid(),
  categorie   text not null check (categorie in ('voirie', 'eclairage', 'securite', 'autre')),
  description text not null check (char_length(trim(description)) between 5 and 500),
  lat         double precision not null check (lat between -90 and 90),
  lng         double precision not null check (lng between -180 and 180),
  created_at  timestamptz not null default now()
);

-- 2. Sécurité au niveau des lignes (RLS) : activée, jamais désactivée
alter table public.signalements enable row level security;

-- 3. Politiques : tout le monde peut LIRE et AJOUTER un signalement.
--    Aucune politique UPDATE ni DELETE : avec la clé publique, personne ne peut
--    modifier ou effacer les signalements des autres. La modération se fait
--    depuis le tableau de bord Supabase (Table Editor).
drop policy if exists "lecture_publique" on public.signalements;
create policy "lecture_publique"
  on public.signalements
  for select
  to anon
  using (true);

drop policy if exists "ajout_public" on public.signalements;
create policy "ajout_public"
  on public.signalements
  for insert
  to anon
  with check (true);

-- 4. Temps réel : les nouveaux signalements apparaissent chez tout le monde sans recharger.
--    (Si une erreur indique que la table est déjà dans la publication, l'ignorer.)
alter publication supabase_realtime add table public.signalements;

-- Pour une vraie mise en production : ajouter Supabase Auth, une colonne user_id
-- et des politiques UPDATE/DELETE limitées au propriétaire (auth.uid() = user_id).
