-- =============================================================================
-- v1.2: Title-first concept generation flow
-- =============================================================================
-- - concept_sets / concepts: persist LLM-generated thumbnail prompts so the
--   user can come back, re-pick, and re-render.
-- - generations.batch_id / concept_id: link rendered generations back to the
--   concept they came from and the batch they were rendered with.
-- - debit_credits_for_generation: extended with two trailing optional params
--   (p_batch_id, p_concept_id), backwards-compatible with all earlier callers.
-- =============================================================================

create table public.concept_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  style_preset text,
  reference_image_path text,
  count int not null check (count in (8, 12, 20)),
  created_at timestamptz not null default now()
);

create index concept_sets_user_idx
  on public.concept_sets (user_id, created_at desc);

alter table public.concept_sets enable row level security;

create policy "concept_sets_select_own"
  on public.concept_sets for select
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
create table public.concepts (
  id uuid primary key default gen_random_uuid(),
  concept_set_id uuid not null references public.concept_sets(id) on delete cascade,
  position int not null,
  label text not null,
  badge text,
  prompt text not null,
  created_at timestamptz not null default now()
);

create unique index concepts_set_position_idx
  on public.concepts (concept_set_id, position);

alter table public.concepts enable row level security;

create policy "concepts_select_via_set"
  on public.concepts for select
  using (
    exists (
      select 1 from public.concept_sets s
      where s.id = concept_set_id and s.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
alter table public.generations
  add column if not exists batch_id uuid,
  add column if not exists concept_id uuid
    references public.concepts(id) on delete set null;

create index if not exists generations_batch_idx
  on public.generations (batch_id);

-- -----------------------------------------------------------------------------
-- Re-create debit_credits_for_generation with two new trailing params.
-- -----------------------------------------------------------------------------
drop function if exists public.debit_credits_for_generation(
  uuid, int, text, text, text, int, uuid, int);

create or replace function public.debit_credits_for_generation(
  p_user_id uuid,
  p_amount int,
  p_prompt text,
  p_style_preset text,
  p_reference_image_path text,
  p_variations int,
  p_parent_generation_id uuid default null,
  p_parent_output_index int default null,
  p_batch_id uuid default null,
  p_concept_id uuid default null
)
returns table (generation_id uuid, new_balance int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_generation_id uuid;
  v_new_balance int;
begin
  if p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  update public.profiles
    set credits_balance = credits_balance - p_amount
    where id = p_user_id and credits_balance >= p_amount
    returning credits_balance into v_new_balance;

  if not found then
    raise exception 'insufficient_credits';
  end if;

  insert into public.generations (
    user_id, prompt, style_preset, reference_image_path, variations,
    credits_used, status, parent_generation_id, parent_output_index,
    batch_id, concept_id
  ) values (
    p_user_id, p_prompt, p_style_preset, p_reference_image_path, p_variations,
    p_amount, 'pending', p_parent_generation_id, p_parent_output_index,
    p_batch_id, p_concept_id
  )
  returning id into v_generation_id;

  insert into public.credit_transactions (user_id, delta, reason, generation_id)
  values (p_user_id, -p_amount, 'generation', v_generation_id);

  return query select v_generation_id, v_new_balance;
end;
$$;

revoke all on function public.debit_credits_for_generation(
  uuid, int, text, text, text, int, uuid, int, uuid, uuid
) from public;

grant execute on function public.debit_credits_for_generation(
  uuid, int, text, text, text, int, uuid, int, uuid, uuid
) to service_role;
