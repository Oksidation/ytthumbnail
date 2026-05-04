-- =============================================================================
-- v1.4: User ratings on generated thumbnails (1–5 stars)
-- =============================================================================
-- - rating: nullable int 1..5 on each generation row
-- - rated_at: when it was set
-- - rate_generation(): SECURITY DEFINER RPC so users can update only their
--   own row and only the rating column. RLS still blocks direct updates.
-- =============================================================================

alter table public.generations
  add column if not exists rating int
    check (rating is null or rating between 1 and 5),
  add column if not exists rated_at timestamptz;

create index if not exists generations_rating_idx
  on public.generations (rating)
  where rating is not null;

create or replace function public.rate_generation(
  p_generation_id uuid,
  p_rating int
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if p_rating < 1 or p_rating > 5 then
    raise exception 'invalid_rating';
  end if;

  select user_id into v_user_id
    from public.generations
    where id = p_generation_id;

  if v_user_id is null then
    raise exception 'generation_not_found';
  end if;

  if v_user_id <> auth.uid() then
    raise exception 'unauthorized';
  end if;

  update public.generations
    set rating = p_rating,
        rated_at = now()
    where id = p_generation_id;

  return p_rating;
end;
$$;

revoke all on function public.rate_generation(uuid, int) from public;
grant execute on function public.rate_generation(uuid, int) to authenticated;
