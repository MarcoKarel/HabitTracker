-- Supabase schema for HabitTracker
-- Creates tables, RLS policies, indexes and helper functions
-- Paste this into Supabase SQL editor (SQL) or run with psql against your Supabase Postgres DB.

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- === Profiles ===
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), -- should match auth.users.id
  username text UNIQUE,
  email text,
  full_name text,
  avatar_url text,
  bio text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- === Habits ===
CREATE TABLE IF NOT EXISTS public.habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text,
  frequency jsonb, -- e.g. {"type":"daily","every":1} or {"type":"weekly","days":[1,3,5]}
  target integer DEFAULT 1,
  start_date date DEFAULT CURRENT_DATE,
  archived boolean DEFAULT false,
  settings jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- === Reminders ===
CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  habit_id uuid REFERENCES public.habits(id) ON DELETE CASCADE,
  enabled boolean DEFAULT true,
  time time, -- local time for reminder
  timezone text,
  days smallint[], -- array of weekdays 0=Sunday..6=Saturday or empty for daily
  last_sent timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- === Completions ===
CREATE TABLE IF NOT EXISTS public.completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  habit_id uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  date date NOT NULL, -- the day this habit was completed
  created_at timestamptz DEFAULT now(),
  note text,
  extras jsonb
);

-- Ensure a user can't double-log the same habit/day
CREATE UNIQUE INDEX IF NOT EXISTS completions_user_habit_date_idx ON public.completions(user_id, habit_id, date);

-- === Notifications / Scheduled jobs tracking ===
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  habit_id uuid REFERENCES public.habits(id) ON DELETE SET NULL,
  scheduled_at timestamptz NOT NULL,
  payload jsonb,
  sent boolean DEFAULT false,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- === Subscriptions / Payments ===
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider text,
  provider_subscription_id text,
  plan text,
  status text,
  started_at timestamptz,
  ends_at timestamptz,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- === Indexes to speed up queries ===
CREATE INDEX IF NOT EXISTS habits_user_idx ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS reminders_user_idx ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS completions_user_idx ON public.completions(user_id, date);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications(user_id, scheduled_at);

-- === Row Level Security (RLS) ===
-- Enable RLS and policies so users only access their own records.

-- Profiles: allow each authenticated user to manage their own profile
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_self" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_delete_self" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- Habits
ALTER TABLE IF EXISTS public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "habits_select_user" ON public.habits
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "habits_insert_user" ON public.habits
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "habits_update_user" ON public.habits
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "habits_delete_user" ON public.habits
  FOR DELETE USING (user_id = auth.uid());

-- Reminders
ALTER TABLE IF EXISTS public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reminders_select_user" ON public.reminders
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "reminders_insert_user" ON public.reminders
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "reminders_update_user" ON public.reminders
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "reminders_delete_user" ON public.reminders
  FOR DELETE USING (user_id = auth.uid());

-- Completions
ALTER TABLE IF EXISTS public.completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "completions_select_user" ON public.completions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "completions_insert_user" ON public.completions
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "completions_update_user" ON public.completions
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "completions_delete_user" ON public.completions
  FOR DELETE USING (user_id = auth.uid());

-- Notifications
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_user" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_insert_user" ON public.notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications_update_user" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications_delete_user" ON public.notifications
  FOR DELETE USING (user_id = auth.uid());

-- Subscriptions
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_select_user" ON public.subscriptions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "subscriptions_insert_user" ON public.subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "subscriptions_update_user" ON public.subscriptions
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "subscriptions_delete_user" ON public.subscriptions
  FOR DELETE USING (user_id = auth.uid());

-- === Helper Functions ===
-- Compute current streak for a given (user_id, habit_id)
CREATE OR REPLACE FUNCTION public.get_current_streak(p_user uuid, p_habit uuid)
RETURNS integer LANGUAGE plpgsql STABLE AS $$
DECLARE
  last_date date;
  streak integer := 0;
  cur_date date := CURRENT_DATE;
BEGIN
  LOOP
    SELECT 1 INTO STRICT last_date FROM public.completions
      WHERE user_id = p_user AND habit_id = p_habit AND date = cur_date;
    IF FOUND THEN
      streak := streak + 1;
      cur_date := cur_date - INTERVAL '1 day';
    ELSE
      EXIT;
    END IF;
  END LOOP;
  RETURN streak;
END;
$$;

-- Compute longest streak for a habit for a user
CREATE OR REPLACE FUNCTION public.get_longest_streak(p_user uuid, p_habit uuid)
RETURNS integer LANGUAGE sql STABLE AS $$
  WITH r AS (
    SELECT date
    FROM public.completions
    WHERE user_id = p_user AND habit_id = p_habit
    ORDER BY date
  ), gaps AS (
    SELECT date, date - row_number() OVER (ORDER BY date) * interval '1 day' AS grp
    FROM r
  )
  SELECT COALESCE(MAX(count), 0) FROM (
    SELECT COUNT(*)::int as count
    FROM gaps
    GROUP BY grp
  ) s;
$$;

-- Convenience view: user's summary statistics
CREATE OR REPLACE VIEW public.user_statistics AS
SELECT
  p.id as user_id,
  (SELECT COUNT(*) FROM public.habits h WHERE h.user_id = p.id) AS habit_count,
  (SELECT COUNT(*) FROM public.completions c WHERE c.user_id = p.id) AS completion_count,
  (SELECT COUNT(*) FROM public.completions c WHERE c.user_id = p.id AND c.date = CURRENT_DATE) AS completions_today
FROM public.profiles p;

-- Grant explicit privileges to authenticated role for reading the view
GRANT SELECT ON public.user_statistics TO authenticated;

-- === Triggers to keep updated_at columns current ===
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'profiles_set_updated_at') THEN
    CREATE TRIGGER profiles_set_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'habits_set_updated_at') THEN
    CREATE TRIGGER habits_set_updated_at
    BEFORE UPDATE ON public.habits
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'reminders_set_updated_at') THEN
    CREATE TRIGGER reminders_set_updated_at
    BEFORE UPDATE ON public.reminders
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'subscriptions_set_updated_at') THEN
    CREATE TRIGGER subscriptions_set_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- === Useful sample queries ===
-- 1) Create a profile for an authenticated user (server-side or via edge function)
-- INSERT INTO public.profiles (id, username, email) VALUES ('<user-uuid>', 'name', 'email');

-- 2) Add a habit
-- INSERT INTO public.habits (user_id, name, frequency) VALUES ('<user-uuid>', 'Meditate', '{"type":"daily"}');

-- 3) Mark completion
-- INSERT INTO public.completions (user_id, habit_id, date) VALUES ('<user-uuid>', '<habit-uuid>', CURRENT_DATE);

-- 4) Get current streak
-- SELECT public.get_current_streak('<user-uuid>'::uuid, '<habit-uuid>'::uuid);

-- End of schema

-- === Aggregations and Heatmap-friendly functions ===

-- Heatmap: returns a row per day in the requested range with completion counts
CREATE OR REPLACE FUNCTION public.get_heatmap(p_user uuid, p_start date, p_end date)
RETURNS TABLE(day date, completions int) LANGUAGE sql STABLE AS $$
  SELECT d::date AS day, COALESCE(c.count, 0) AS completions
  FROM generate_series(p_start, p_end, interval '1 day') AS d
  LEFT JOIN (
    SELECT date, COUNT(*) AS count
    FROM public.completions
    WHERE user_id = p_user AND date BETWEEN p_start AND p_end
    GROUP BY date
  ) c ON c.date = d::date
  ORDER BY d::date;
$$;

-- Weekly aggregation: returns N weeks of summaries (week_start, week_end, completion_count, habit_count, avg_completions_per_habit)
CREATE OR REPLACE FUNCTION public.get_weekly_aggregations(p_user uuid, p_weeks integer DEFAULT 12)
RETURNS TABLE(week_start date, week_end date, completions int, habit_count int, completions_per_habit numeric)
LANGUAGE sql STABLE AS $$
  WITH weeks AS (
    SELECT generate_series(
      (date_trunc('week', CURRENT_DATE) - (p_weeks - 1) * interval '1 week')::date,
      date_trunc('week', CURRENT_DATE)::date,
      '1 week'
    ) AS week_start
  ),
  comp AS (
    SELECT date_trunc('week', date)::date AS wk, COUNT(*)::int AS cnt
    FROM public.completions
    WHERE user_id = p_user
    GROUP BY wk
  ),
  h AS (
    SELECT COUNT(*)::int AS habit_count FROM public.habits WHERE user_id = p_user
  )
  SELECT
    w.week_start AS week_start,
    (w.week_start + interval '6 days')::date AS week_end,
    COALESCE(c.cnt, 0) AS completions,
    COALESCE(h.habit_count, 0) AS habit_count,
    CASE WHEN COALESCE(h.habit_count, 0) = 0 THEN 0 ELSE ROUND(COALESCE(c.cnt, 0)::numeric / h.habit_count::numeric, 2) END AS completions_per_habit
  FROM weeks w
  LEFT JOIN comp c ON c.wk = w.week_start
  CROSS JOIN h
  ORDER BY w.week_start;
$$;

-- Monthly aggregation: returns N months of summaries (month_start, month_end, completion_count, habit_count, avg_completions_per_habit)
CREATE OR REPLACE FUNCTION public.get_monthly_aggregations(p_user uuid, p_months integer DEFAULT 6)
RETURNS TABLE(month_start date, month_end date, completions int, habit_count int, completions_per_habit numeric)
LANGUAGE sql STABLE AS $$
  WITH months AS (
    SELECT generate_series(
      (date_trunc('month', CURRENT_DATE) - (p_months - 1) * interval '1 month')::date,
      date_trunc('month', CURRENT_DATE)::date,
      '1 month'
    ) AS month_start
  ),
  comp AS (
    SELECT date_trunc('month', date)::date AS mth, COUNT(*)::int AS cnt
    FROM public.completions
    WHERE user_id = p_user
    GROUP BY mth
  ),
  h AS (
    SELECT COUNT(*)::int AS habit_count FROM public.habits WHERE user_id = p_user
  )
  SELECT
    m.month_start AS month_start,
    (date_trunc('month', m.month_start) + (interval '1 month' - interval '1 day'))::date AS month_end,
    COALESCE(c.cnt, 0) AS completions,
    COALESCE(h.habit_count, 0) AS habit_count,
    CASE WHEN COALESCE(h.habit_count, 0) = 0 THEN 0 ELSE ROUND(COALESCE(c.cnt, 0)::numeric / h.habit_count::numeric, 2) END AS completions_per_habit
  FROM months m
  LEFT JOIN comp c ON c.mth = m.month_start
  CROSS JOIN h
  ORDER BY m.month_start;
$$;

-- Grant execute on functions to authenticated role
GRANT EXECUTE ON FUNCTION public.get_heatmap(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_aggregations(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_aggregations(uuid, integer) TO authenticated;

-- Sample usage comments:
-- SELECT * FROM public.get_heatmap('<user-uuid>'::uuid, '2025-01-01'::date, '2025-01-31'::date);
-- SELECT * FROM public.get_weekly_aggregations('<user-uuid>'::uuid, 12);
-- SELECT * FROM public.get_monthly_aggregations('<user-uuid>'::uuid, 6);
