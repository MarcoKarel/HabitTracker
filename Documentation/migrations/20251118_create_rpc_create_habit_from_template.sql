-- Migration: create RPC to insert habits using auth.uid()
-- Adds function public.create_habit_from_template(p_name, p_description, p_color, p_start_date, p_template_id)
-- which inserts a habit row using auth.uid() as user_id and returns the inserted row.

create or replace function public.create_habit_from_template(
  p_name text,
  p_description text,
  p_color text,
  p_start_date date,
  p_template_id uuid
)
returns public.habits as $$
declare
  result public.habits%rowtype;
begin
  insert into public.habits(
    user_id,
    name,
    description,
    color,
    frequency,
    start_date,
    template_id,
    created_at
  ) values (
    auth.uid(),
    p_name,
    p_description,
    p_color,
    jsonb_build_object('type','daily','every',1),
    p_start_date,
    p_template_id,
    now()
  ) returning * into result;

  return result;
end;
$$ language plpgsql;

-- Note: This function uses auth.uid() to ensure the inserted habit is owned by the caller.
-- Apply this migration in your Supabase project (SQL editor or migration tooling).