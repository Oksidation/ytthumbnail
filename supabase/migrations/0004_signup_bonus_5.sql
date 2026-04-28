-- =============================================================================
-- Increase signup bonus from 3 to 5 free thumbnails
-- =============================================================================
-- - Update default for new accounts (handle_new_user trigger fn)
-- - Top up existing accounts that still have their original 3-credit bonus
--   AND no other transactions, so we don't accidentally bump active users.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_signup_bonus int := 5;
begin
  insert into public.profiles (id, email, credits_balance)
  values (new.id, new.email, v_signup_bonus);

  insert into public.credit_transactions (user_id, delta, reason)
  values (new.id, v_signup_bonus, 'signup_bonus');

  return new;
end;
$$;

-- Backfill: any user whose only transaction is the original 3-credit signup_bonus
-- and whose balance is still exactly 3 gets +2 credits + a matching ledger entry.
do $$
declare
  r record;
begin
  for r in
    select p.id
    from public.profiles p
    where p.credits_balance = 3
      and (
        select count(*) from public.credit_transactions t where t.user_id = p.id
      ) = 1
      and exists (
        select 1 from public.credit_transactions t
        where t.user_id = p.id
          and t.reason = 'signup_bonus'
          and t.delta = 3
      )
  loop
    update public.profiles
      set credits_balance = credits_balance + 2
      where id = r.id;

    insert into public.credit_transactions (user_id, delta, reason)
    values (r.id, 2, 'signup_bonus');
  end loop;
end$$;
