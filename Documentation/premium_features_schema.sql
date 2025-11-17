-- ========================================
-- PREMIUM FEATURES SCHEMA
-- Extends the base schema with premium features
-- ========================================

-- ========================================
-- PART 1: Add Premium Tracking to Profiles
-- ========================================

-- Add subscription tier and premium features to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'personal', 'enterprise')),
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'expired')),
  ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz;

-- ========================================
-- PART 2: Habit Categories
-- ========================================

CREATE TABLE IF NOT EXISTS public.habit_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text,
  color text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Add category to habits table
ALTER TABLE public.habits 
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.habit_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tags text[];

-- RLS for categories
ALTER TABLE public.habit_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_select_user" ON public.habit_categories
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "categories_insert_user" ON public.habit_categories
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "categories_update_user" ON public.habit_categories
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "categories_delete_user" ON public.habit_categories
  FOR DELETE USING (user_id = auth.uid());

-- ========================================
-- PART 3: Habit Templates (Premium)
-- ========================================

CREATE TABLE IF NOT EXISTS public.habit_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text,
  icon text,
  color text,
  frequency jsonb,
  suggested_reminder_time time,
  tags text[],
  is_premium boolean DEFAULT false,
  popularity integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Seed some templates
INSERT INTO public.habit_templates (name, description, category, icon, color, frequency, suggested_reminder_time, tags, is_premium) VALUES
  ('Morning Exercise', 'Start your day with 30 minutes of exercise', 'Health', 'fitness', '#FF6B6B', '{"type":"daily"}', '06:00:00', ARRAY['health', 'fitness', 'morning'], false),
  ('Drink Water', 'Drink 8 glasses of water throughout the day', 'Health', 'water', '#4ECDC4', '{"type":"daily"}', '09:00:00', ARRAY['health', 'wellness'], false),
  ('Meditation', 'Practice mindfulness for 10 minutes', 'Mindfulness', 'flower', '#95E1D3', '{"type":"daily"}', '07:00:00', ARRAY['mindfulness', 'mental health'], false),
  ('Read 30 Minutes', 'Read for personal development', 'Learning', 'book', '#F38181', '{"type":"daily"}', '20:00:00', ARRAY['learning', 'reading'], false),
  ('Journal', 'Write down your thoughts and gratitude', 'Mindfulness', 'create', '#AA96DA', '{"type":"daily"}', '21:00:00', ARRAY['mindfulness', 'writing'], false),
  ('Learn New Language', 'Practice language learning for 20 minutes', 'Learning', 'language', '#FCBAD3', '{"type":"daily"}', '18:00:00', ARRAY['learning', 'language'], true),
  ('Meal Prep', 'Prepare healthy meals for the week', 'Health', 'restaurant', '#A8D8EA', '{"type":"weekly","days":[0]}', '10:00:00', ARRAY['health', 'cooking'], true),
  ('Deep Work Session', '2 hours of focused, uninterrupted work', 'Productivity', 'bulb', '#FFD93D', '{"type":"daily"}', '09:00:00', ARRAY['productivity', 'focus'], true),
  ('Practice Instrument', 'Practice your musical instrument', 'Hobbies', 'musical-notes', '#6BCF7F', '{"type":"daily"}', '17:00:00', ARRAY['hobbies', 'music'], true),
  ('Networking', 'Connect with someone in your professional network', 'Career', 'people', '#F3A683', '{"type":"weekly","days":[1,3]}', '15:00:00', ARRAY['career', 'networking'], true)
ON CONFLICT DO NOTHING;

-- Allow anyone to read templates
ALTER TABLE public.habit_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_select_all" ON public.habit_templates
  FOR SELECT USING (true);

-- ========================================
-- PART 4: Custom Themes (Premium)
-- ========================================

CREATE TABLE IF NOT EXISTS public.custom_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean DEFAULT false,
  colors jsonb NOT NULL, -- {"primary": "#xxx", "secondary": "#xxx", "background": "#xxx", etc.}
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- RLS for custom themes
ALTER TABLE public.custom_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "themes_select_user" ON public.custom_themes
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "themes_insert_user" ON public.custom_themes
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "themes_update_user" ON public.custom_themes
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "themes_delete_user" ON public.custom_themes
  FOR DELETE USING (user_id = auth.uid());

-- ========================================
-- PART 5: Progress Photos (Premium)
-- ========================================

CREATE TABLE IF NOT EXISTS public.habit_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  habit_id uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  completion_id uuid REFERENCES public.completions(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  note text,
  taken_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS habit_photos_user_habit_idx ON public.habit_photos(user_id, habit_id, taken_at DESC);

-- RLS for photos
ALTER TABLE public.habit_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photos_select_user" ON public.habit_photos
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "photos_insert_user" ON public.habit_photos
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "photos_update_user" ON public.habit_photos
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "photos_delete_user" ON public.habit_photos
  FOR DELETE USING (user_id = auth.uid());

-- ========================================
-- PART 6: Advanced Analytics Tables
-- ========================================

-- Habit insights cache (calculated daily)
CREATE TABLE IF NOT EXISTS public.habit_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  habit_id uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  best_completion_time time,
  average_completion_time time,
  completion_rate_7d decimal(5,2),
  completion_rate_30d decimal(5,2),
  completion_rate_90d decimal(5,2),
  predictions jsonb, -- {"tomorrow": 0.85, "next_7_days": 0.78}
  insights jsonb, -- {"pattern": "morning_person", "suggested_time": "07:00"}
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, habit_id, date)
);

CREATE INDEX IF NOT EXISTS habit_insights_user_date_idx ON public.habit_insights(user_id, date DESC);

-- RLS for insights
ALTER TABLE public.habit_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insights_select_user" ON public.habit_insights
  FOR SELECT USING (user_id = auth.uid());

-- ========================================
-- PART 7: Premium Functions
-- ========================================

-- Function to check if user is premium
CREATE OR REPLACE FUNCTION public.is_user_premium(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT 
    subscription_status = 'active' 
    AND subscription_tier IN ('personal', 'enterprise')
    AND (subscription_ends_at IS NULL OR subscription_ends_at > now())
  FROM public.profiles
  WHERE id = p_user_id;
$$;

-- Function to get habit count for user
CREATE OR REPLACE FUNCTION public.get_user_habit_count(p_user_id uuid)
RETURNS integer LANGUAGE sql STABLE AS $$
  SELECT COUNT(*)::integer
  FROM public.habits
  WHERE user_id = p_user_id AND archived = false;
$$;

-- Function to check if user can create more habits
CREATE OR REPLACE FUNCTION public.can_create_habit(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT 
    public.is_user_premium(p_user_id) 
    OR public.get_user_habit_count(p_user_id) < 5;
$$;

-- Function to get advanced analytics for a habit (Premium)
CREATE OR REPLACE FUNCTION public.get_habit_analytics(p_user_id uuid, p_habit_id uuid)
RETURNS TABLE(
  total_completions bigint,
  current_streak integer,
  longest_streak integer,
  completion_rate_7d decimal,
  completion_rate_30d decimal,
  completion_rate_90d decimal,
  best_day_of_week text,
  average_time_of_day time,
  most_productive_hour integer,
  consistency_score decimal,
  predicted_success_rate decimal
) LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_is_premium boolean;
BEGIN
  -- Check if user is premium
  SELECT public.is_user_premium(p_user_id) INTO v_is_premium;
  
  IF NOT v_is_premium THEN
    RAISE EXCEPTION 'Premium feature: Upgrade to access advanced analytics';
  END IF;

  RETURN QUERY
  WITH completion_data AS (
    SELECT 
      date,
      EXTRACT(DOW FROM date) as day_of_week,
      EXTRACT(HOUR FROM created_at) as hour_of_day,
      created_at
    FROM public.completions
    WHERE user_id = p_user_id AND habit_id = p_habit_id
  ),
  stats AS (
    SELECT
      COUNT(*) as total,
      public.get_current_streak(p_user_id, p_habit_id) as curr_streak,
      public.get_longest_streak(p_user_id, p_habit_id) as long_streak,
      -- 7 day rate
      (SELECT COUNT(*) * 100.0 / 7 
       FROM completion_data 
       WHERE date >= CURRENT_DATE - INTERVAL '7 days')::decimal(5,2) as rate_7d,
      -- 30 day rate
      (SELECT COUNT(*) * 100.0 / 30 
       FROM completion_data 
       WHERE date >= CURRENT_DATE - INTERVAL '30 days')::decimal(5,2) as rate_30d,
      -- 90 day rate
      (SELECT COUNT(*) * 100.0 / 90 
       FROM completion_data 
       WHERE date >= CURRENT_DATE - INTERVAL '90 days')::decimal(5,2) as rate_90d,
      -- Best day
      (SELECT 
         CASE day_of_week
           WHEN 0 THEN 'Sunday'
           WHEN 1 THEN 'Monday'
           WHEN 2 THEN 'Tuesday'
           WHEN 3 THEN 'Wednesday'
           WHEN 4 THEN 'Thursday'
           WHEN 5 THEN 'Friday'
           WHEN 6 THEN 'Saturday'
         END
       FROM completion_data
       GROUP BY day_of_week
       ORDER BY COUNT(*) DESC
       LIMIT 1) as best_day,
      -- Average time
      (SELECT created_at::time
       FROM completion_data
       ORDER BY created_at DESC
       LIMIT 1) as avg_time,
      -- Most productive hour
      (SELECT hour_of_day::integer
       FROM completion_data
       WHERE hour_of_day IS NOT NULL
       GROUP BY hour_of_day
       ORDER BY COUNT(*) DESC
       LIMIT 1) as prod_hour,
      -- Consistency score (based on streak vs total days)
      (public.get_current_streak(p_user_id, p_habit_id)::decimal / 
       GREATEST(EXTRACT(DAY FROM (now() - (SELECT MIN(created_at) FROM completion_data)))::integer, 1) * 100)::decimal(5,2) as consistency,
      -- Predicted success (based on recent trend)
      LEAST(
        (SELECT COUNT(*) * 100.0 / 7 
         FROM completion_data 
         WHERE date >= CURRENT_DATE - INTERVAL '7 days')::decimal(5,2),
        100.0
      ) as prediction
    FROM completion_data
  )
  SELECT 
    stats.total,
    stats.curr_streak,
    stats.long_streak,
    stats.rate_7d,
    stats.rate_30d,
    stats.rate_90d,
    COALESCE(stats.best_day, 'N/A'),
    stats.avg_time,
    COALESCE(stats.prod_hour, 0),
    COALESCE(stats.consistency, 0),
    COALESCE(stats.prediction, 0)
  FROM stats;
END;
$$;

-- Function to export user data (Premium)
CREATE OR REPLACE FUNCTION public.export_user_data(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_is_premium boolean;
  v_result jsonb;
BEGIN
  -- Check if user is premium
  SELECT public.is_user_premium(p_user_id) INTO v_is_premium;
  
  IF NOT v_is_premium THEN
    RAISE EXCEPTION 'Premium feature: Upgrade to export your data';
  END IF;

  SELECT jsonb_build_object(
    'profile', (SELECT row_to_json(p.*) FROM public.profiles p WHERE id = p_user_id),
    'habits', (SELECT jsonb_agg(row_to_json(h.*)) FROM public.habits h WHERE user_id = p_user_id),
    'completions', (SELECT jsonb_agg(row_to_json(c.*)) FROM public.completions c WHERE user_id = p_user_id),
    'categories', (SELECT jsonb_agg(row_to_json(cat.*)) FROM public.habit_categories cat WHERE user_id = p_user_id),
    'statistics', jsonb_build_object(
      'total_habits', (SELECT COUNT(*) FROM public.habits WHERE user_id = p_user_id),
      'total_completions', (SELECT COUNT(*) FROM public.completions WHERE user_id = p_user_id),
      'best_streak', (SELECT MAX(public.get_current_streak(p_user_id, id)) FROM public.habits WHERE user_id = p_user_id)
    ),
    'exported_at', now()
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Function to get habit recommendations (Premium)
CREATE OR REPLACE FUNCTION public.get_habit_recommendations(p_user_id uuid)
RETURNS TABLE(
  template_id uuid,
  template_name text,
  reason text,
  score integer
) LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_is_premium boolean;
BEGIN
  SELECT public.is_user_premium(p_user_id) INTO v_is_premium;
  
  IF NOT v_is_premium THEN
    RAISE EXCEPTION 'Premium feature: Upgrade to get personalized recommendations';
  END IF;

  RETURN QUERY
  WITH user_categories AS (
    SELECT DISTINCT category_id
    FROM public.habits
    WHERE user_id = p_user_id
  ),
  user_tags AS (
    SELECT DISTINCT unnest(tags) as tag
    FROM public.habits
    WHERE user_id = p_user_id
  )
  SELECT 
    t.id,
    t.name,
    CASE 
      WHEN t.category IN (SELECT hc.name FROM public.habit_categories hc WHERE hc.id IN (SELECT category_id FROM user_categories)) 
        THEN 'Based on your existing habits'
      WHEN EXISTS (SELECT 1 FROM user_tags ut WHERE ut.tag = ANY(t.tags))
        THEN 'Complements your interests'
      ELSE 'Popular choice'
    END as reason,
    (t.popularity + 
     CASE WHEN t.category IN (SELECT hc.name FROM public.habit_categories hc WHERE hc.id IN (SELECT category_id FROM user_categories)) THEN 50 ELSE 0 END +
     CASE WHEN EXISTS (SELECT 1 FROM user_tags ut WHERE ut.tag = ANY(t.tags)) THEN 30 ELSE 0 END
    ) as score
  FROM public.habit_templates t
  WHERE t.id NOT IN (SELECT id FROM public.habits WHERE user_id = p_user_id)
    AND (NOT t.is_premium OR v_is_premium)
  ORDER BY score DESC
  LIMIT 10;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_user_premium(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_habit_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_create_habit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_habit_analytics(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.export_user_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_habit_recommendations(uuid) TO authenticated;

-- ========================================
-- COMPLETE!
-- ========================================

RAISE NOTICE '========================================';
RAISE NOTICE 'Premium features schema complete!';
RAISE NOTICE 'Premium features include:';
RAISE NOTICE '- Unlimited habits (free = 5 limit)';
RAISE NOTICE '- Advanced analytics & insights';
RAISE NOTICE '- Habit categories & tags';
RAISE NOTICE '- Custom themes';
RAISE NOTICE '- Progress photos';
RAISE NOTICE '- Data export';
RAISE NOTICE '- Habit recommendations';
RAISE NOTICE '- Premium templates';
RAISE NOTICE '========================================';
