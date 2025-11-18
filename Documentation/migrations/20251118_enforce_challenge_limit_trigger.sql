-- Migration: Enforce active challenge limits with trigger on user_challenges
-- Free users: max 1 active challenge. Premium users: max 3 active challenges.
-- This trigger prevents inserting a new active user_challenges row when the user already has the maximum active challenges.

create or replace function public.enforce_user_challenge_limit()
returns trigger as $$
declare
  current_count int;
  is_premium boolean;
  max_allowed int;
begin
  -- Only enforce for rows marked 'active'
  if (NEW.status is not null and NEW.status <> 'active') then
    return NEW;
  end if;

  -- Determine premium status from profiles table (fallback to false)
  select p.is_premium into is_premium from public.profiles p where p.id = NEW.user_id;
  if is_premium is null then
    is_premium := false;
  end if;

  max_allowed := case when is_premium then 3 else 1 end;

  select count(*) into current_count from public.user_challenges uc where uc.user_id = NEW.user_id and uc.status = 'active';

  if current_count >= max_allowed then
    raise exception 'CHALLENGE_LIMIT_REACHED: user has % active and max is %', current_count, max_allowed;
  end if;

  return NEW;
end;
$$ language plpgsql;

-- Attach the trigger to run BEFORE INSERT on user_challenges
drop trigger if exists trg_enforce_user_challenge_limit on public.user_challenges;
create trigger trg_enforce_user_challenge_limit
before insert on public.user_challenges
for each row execute function public.enforce_user_challenge_limit();

-- Note: Apply this migration in your Supabase project. This prevents inserting more than allowed active challenges for a user.
