-- ========================================
-- COPY-PASTE THIS ENTIRE FILE INTO SUPABASE SQL EDITOR
-- This is the minimal version - creates only what's needed
-- ========================================

-- Add streak columns to habits table
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS current_streak integer DEFAULT 0;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS longest_streak integer DEFAULT 0;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS last_completed_date date;

-- Function: Get current streak
CREATE OR REPLACE FUNCTION public.get_current_streak(p_user uuid, p_habit uuid)
RETURNS integer LANGUAGE plpgsql STABLE AS $$
DECLARE
  streak integer := 0;
  cur_date date := CURRENT_DATE;
  found_completion boolean;
BEGIN
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM public.completions
      WHERE user_id = p_user AND habit_id = p_habit AND date = cur_date
    ) INTO found_completion;
    
    IF found_completion THEN
      streak := streak + 1;
      cur_date := cur_date - INTERVAL '1 day';
    ELSE
      EXIT;
    END IF;
  END LOOP;
  RETURN streak;
END;
$$;

-- Function: Get longest streak
CREATE OR REPLACE FUNCTION public.get_longest_streak(p_user uuid, p_habit uuid)
RETURNS integer LANGUAGE sql STABLE AS $$
  WITH r AS (
    SELECT date FROM public.completions
    WHERE user_id = p_user AND habit_id = p_habit
    ORDER BY date
  ), gaps AS (
    SELECT date, date - (row_number() OVER (ORDER BY date))::integer * interval '1 day' AS grp
    FROM r
  )
  SELECT COALESCE(MAX(count), 0)::integer FROM (
    SELECT COUNT(*)::integer as count FROM gaps GROUP BY grp
  ) s;
$$;

-- Function: Get top streaks
CREATE OR REPLACE FUNCTION public.get_top_streaks(p_user uuid, p_limit integer DEFAULT 3)
RETURNS TABLE(habit_name text, current_streak integer, habit_id uuid) 
LANGUAGE sql STABLE AS $$
  SELECT 
    h.name as habit_name,
    public.get_current_streak(p_user, h.id) as current_streak,
    h.id as habit_id
  FROM public.habits h
  WHERE h.user_id = p_user AND h.archived = false
  ORDER BY public.get_current_streak(p_user, h.id) DESC
  LIMIT p_limit;
$$;

-- View: Dashboard stats
CREATE OR REPLACE VIEW public.user_dashboard_stats AS
SELECT
  p.id as user_id,
  (SELECT COUNT(*) FROM public.habits h WHERE h.user_id = p.id AND h.archived = false) AS total_habits,
  (SELECT COUNT(DISTINCT c.habit_id) 
   FROM public.completions c 
   INNER JOIN public.habits h ON c.habit_id = h.id
   WHERE c.user_id = p.id AND c.date = CURRENT_DATE AND h.archived = false) AS completed_today,
  (SELECT COALESCE(MAX(public.get_current_streak(p.id, h.id)), 0)
   FROM public.habits h 
   WHERE h.user_id = p.id AND h.archived = false) AS best_current_streak,
  (SELECT COUNT(*) FROM public.completions c WHERE c.user_id = p.id) AS total_completions
FROM public.profiles p;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_current_streak(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_longest_streak(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_streaks(uuid, integer) TO authenticated;
GRANT SELECT ON public.user_dashboard_stats TO authenticated;

-- Done! Test with:
-- SELECT * FROM public.user_dashboard_stats WHERE user_id = auth.uid();
-- SELECT * FROM public.get_top_streaks(auth.uid(), 3);
