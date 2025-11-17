-- ========================================
-- STREAK TRACKING VERIFICATION & SETUP
-- Run this in Supabase SQL Editor
-- ========================================

-- This script will:
-- 1. Check if required tables and columns exist
-- 2. Create missing columns if needed
-- 3. Create/update streak calculation functions
-- 4. Create a materialized view for efficient streak queries

-- ========================================
-- PART 1: Verify Core Tables Exist
-- ========================================

DO $$ 
BEGIN
    -- Check if profiles table exists
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        RAISE NOTICE 'WARNING: profiles table does not exist. Run the main schema first.';
    ELSE
        RAISE NOTICE '✓ profiles table exists';
    END IF;

    -- Check if habits table exists
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'habits') THEN
        RAISE NOTICE 'WARNING: habits table does not exist. Run the main schema first.';
    ELSE
        RAISE NOTICE '✓ habits table exists';
    END IF;

    -- Check if completions table exists
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'completions') THEN
        RAISE NOTICE 'WARNING: completions table does not exist. Run the main schema first.';
    ELSE
        RAISE NOTICE '✓ completions table exists';
    END IF;
END $$;

-- ========================================
-- PART 2: Check/Add Streak Tracking Columns
-- ========================================

-- Add current_streak column to habits table (optional - can be calculated on-the-fly)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'habits' 
        AND column_name = 'current_streak'
    ) THEN
        ALTER TABLE public.habits ADD COLUMN current_streak integer DEFAULT 0;
        RAISE NOTICE '✓ Added current_streak column to habits table';
    ELSE
        RAISE NOTICE '✓ current_streak column already exists in habits table';
    END IF;
END $$;

-- Add longest_streak column to habits table (optional - can be calculated on-the-fly)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'habits' 
        AND column_name = 'longest_streak'
    ) THEN
        ALTER TABLE public.habits ADD COLUMN longest_streak integer DEFAULT 0;
        RAISE NOTICE '✓ Added longest_streak column to habits table';
    ELSE
        RAISE NOTICE '✓ longest_streak column already exists in habits table';
    END IF;
END $$;

-- Add last_completed_date column to habits table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'habits' 
        AND column_name = 'last_completed_date'
    ) THEN
        ALTER TABLE public.habits ADD COLUMN last_completed_date date;
        RAISE NOTICE '✓ Added last_completed_date column to habits table';
    ELSE
        RAISE NOTICE '✓ last_completed_date column already exists in habits table';
    END IF;
END $$;

-- ========================================
-- PART 3: Create/Update Streak Functions
-- ========================================

-- Function to calculate current streak for a habit
CREATE OR REPLACE FUNCTION public.get_current_streak(p_user uuid, p_habit uuid)
RETURNS integer LANGUAGE plpgsql STABLE AS $$
DECLARE
  streak integer := 0;
  cur_date date := CURRENT_DATE;
  found_completion boolean;
BEGIN
  LOOP
    -- Check if there's a completion for cur_date
    SELECT EXISTS(
      SELECT 1 FROM public.completions
      WHERE user_id = p_user AND habit_id = p_habit AND date = cur_date
    ) INTO found_completion;
    
    IF found_completion THEN
      streak := streak + 1;
      cur_date := cur_date - INTERVAL '1 day';
    ELSE
      -- If it's today and no completion, streak is still valid (haven't broken it yet)
      -- But if it's yesterday or before, the streak is broken
      IF cur_date < CURRENT_DATE THEN
        EXIT;
      ELSE
        -- Today but not completed yet - check if there's a streak before today
        cur_date := cur_date - INTERVAL '1 day';
        EXIT;
      END IF;
    END IF;
  END LOOP;
  
  RETURN streak;
END;
$$;

-- Function to calculate longest streak for a habit
CREATE OR REPLACE FUNCTION public.get_longest_streak(p_user uuid, p_habit uuid)
RETURNS integer LANGUAGE sql STABLE AS $$
  WITH r AS (
    SELECT date
    FROM public.completions
    WHERE user_id = p_user AND habit_id = p_habit
    ORDER BY date
  ), gaps AS (
    SELECT date, date - (row_number() OVER (ORDER BY date))::integer * interval '1 day' AS grp
    FROM r
  )
  SELECT COALESCE(MAX(count), 0)::integer FROM (
    SELECT COUNT(*)::integer as count
    FROM gaps
    GROUP BY grp
  ) s;
$$;

-- Function to get all habits with their streak information for a user
CREATE OR REPLACE FUNCTION public.get_habits_with_streaks(p_user uuid)
RETURNS TABLE(
  habit_id uuid,
  habit_name text,
  description text,
  color text,
  current_streak integer,
  longest_streak integer,
  completed_today boolean,
  last_completed_date date,
  total_completions bigint
) LANGUAGE sql STABLE AS $$
  SELECT 
    h.id as habit_id,
    h.name as habit_name,
    h.description,
    h.color,
    public.get_current_streak(p_user, h.id) as current_streak,
    public.get_longest_streak(p_user, h.id) as longest_streak,
    EXISTS(
      SELECT 1 FROM public.completions c 
      WHERE c.user_id = p_user 
      AND c.habit_id = h.id 
      AND c.date = CURRENT_DATE
    ) as completed_today,
    (
      SELECT MAX(date) FROM public.completions c 
      WHERE c.user_id = p_user AND c.habit_id = h.id
    ) as last_completed_date,
    (
      SELECT COUNT(*) FROM public.completions c 
      WHERE c.user_id = p_user AND c.habit_id = h.id
    ) as total_completions
  FROM public.habits h
  WHERE h.user_id = p_user AND h.archived = false
  ORDER BY h.created_at DESC;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_current_streak(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_longest_streak(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_habits_with_streaks(uuid) TO authenticated;

-- ========================================
-- PART 4: Create Dashboard Statistics View
-- ========================================

CREATE OR REPLACE VIEW public.user_dashboard_stats AS
SELECT
  p.id as user_id,
  p.username,
  -- Total habits count
  (SELECT COUNT(*) FROM public.habits h WHERE h.user_id = p.id AND h.archived = false) AS total_habits,
  -- Completed today count
  (SELECT COUNT(DISTINCT c.habit_id) 
   FROM public.completions c 
   INNER JOIN public.habits h ON c.habit_id = h.id
   WHERE c.user_id = p.id AND c.date = CURRENT_DATE AND h.archived = false) AS completed_today,
  -- Best streak across all habits
  (SELECT MAX(public.get_current_streak(p.id, h.id)) 
   FROM public.habits h 
   WHERE h.user_id = p.id AND h.archived = false) AS best_current_streak,
  -- Total completions all time
  (SELECT COUNT(*) FROM public.completions c WHERE c.user_id = p.id) AS total_completions,
  -- Completions this week
  (SELECT COUNT(*) 
   FROM public.completions c 
   WHERE c.user_id = p.id 
   AND c.date >= date_trunc('week', CURRENT_DATE)) AS completions_this_week,
  -- Completions this month
  (SELECT COUNT(*) 
   FROM public.completions c 
   WHERE c.user_id = p.id 
   AND c.date >= date_trunc('month', CURRENT_DATE)) AS completions_this_month
FROM public.profiles p;

-- Grant select on the view
GRANT SELECT ON public.user_dashboard_stats TO authenticated;

-- ========================================
-- PART 5: Create Helper Function for Top Streaks
-- ========================================

CREATE OR REPLACE FUNCTION public.get_top_streaks(p_user uuid, p_limit integer DEFAULT 3)
RETURNS TABLE(
  habit_name text,
  current_streak integer,
  habit_id uuid
) LANGUAGE sql STABLE AS $$
  SELECT 
    h.name as habit_name,
    public.get_current_streak(p_user, h.id) as current_streak,
    h.id as habit_id
  FROM public.habits h
  WHERE h.user_id = p_user AND h.archived = false
  ORDER BY public.get_current_streak(p_user, h.id) DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_streaks(uuid, integer) TO authenticated;

-- ========================================
-- PART 6: Create Trigger to Update Last Completed Date
-- ========================================

CREATE OR REPLACE FUNCTION public.update_habit_last_completed()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.habits
    SET last_completed_date = NEW.date
    WHERE id = NEW.habit_id 
    AND (last_completed_date IS NULL OR last_completed_date < NEW.date);
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.habits
    SET last_completed_date = (
      SELECT MAX(date) FROM public.completions 
      WHERE habit_id = OLD.habit_id
    )
    WHERE id = OLD.habit_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_habit_last_completed_trigger ON public.completions;
CREATE TRIGGER update_habit_last_completed_trigger
AFTER INSERT OR DELETE ON public.completions
FOR EACH ROW EXECUTE FUNCTION public.update_habit_last_completed();

-- ========================================
-- PART 7: Verification Queries
-- ========================================

-- Run these to verify everything is working:

-- 1. Check if all functions exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_streak') THEN
        RAISE NOTICE '✓ get_current_streak function exists';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_longest_streak') THEN
        RAISE NOTICE '✓ get_longest_streak function exists';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_habits_with_streaks') THEN
        RAISE NOTICE '✓ get_habits_with_streaks function exists';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_top_streaks') THEN
        RAISE NOTICE '✓ get_top_streaks function exists';
    END IF;
END $$;

-- 2. Check if view exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'user_dashboard_stats') THEN
        RAISE NOTICE '✓ user_dashboard_stats view exists';
    END IF;
END $$;

-- ========================================
-- EXAMPLE USAGE QUERIES
-- ========================================

-- Example 1: Get current user's dashboard stats
-- SELECT * FROM public.user_dashboard_stats WHERE user_id = auth.uid();

-- Example 2: Get all habits with streak information
-- SELECT * FROM public.get_habits_with_streaks(auth.uid());

-- Example 3: Get top 3 streaks
-- SELECT * FROM public.get_top_streaks(auth.uid(), 3);

-- Example 4: Get specific habit's current streak
-- SELECT public.get_current_streak(auth.uid(), '<habit-uuid>'::uuid);

-- Example 5: Get specific habit's longest streak
-- SELECT public.get_longest_streak(auth.uid(), '<habit-uuid>'::uuid);

-- ========================================
-- COMPLETE! 
-- ========================================

RAISE NOTICE '========================================';
RAISE NOTICE 'Streak tracking setup complete!';
RAISE NOTICE 'Run the EXAMPLE USAGE QUERIES to test.';
RAISE NOTICE '========================================';
