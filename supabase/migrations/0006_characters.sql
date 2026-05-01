-- =============================================================================
-- v1.3: Character training (multi-image references)
-- =============================================================================
-- - characters: named bundles of 1-5 reference images per user
-- - concept_sets.character_id: link a concept set to its character so renders
--   pull every image as combined reference
-- =============================================================================

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  image_paths text[] not null check (
    cardinality(image_paths) between 1 and 5
  ),
  created_at timestamptz not null default now()
);

create index characters_user_idx
  on public.characters (user_id, created_at desc);

alter table public.characters enable row level security;

create policy "characters_select_own"
  on public.characters for select
  using (auth.uid() = user_id);

create policy "characters_insert_own"
  on public.characters for insert
  with check (auth.uid() = user_id);

create policy "characters_update_own"
  on public.characters for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "characters_delete_own"
  on public.characters for delete
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
alter table public.concept_sets
  add column if not exists character_id uuid
    references public.characters(id) on delete set null;
