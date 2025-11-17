-- ========================================
-- STREAK TRACKING VERIFICATION QUERY
-- Run this FIRST to see what exists
-- ========================================

-- This will show you what tables, columns, functions, and views exist
-- Copy the output to see what needs to be created

-- ========================================
-- 1. Check Core Tables
-- ========================================
SELECT 
  'TABLE CHECK' as check_type,
  CASE 
    WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles')
    THEN '✓ profiles table EXISTS'
    ELSE '✗ profiles table MISSING'
  END as profiles_status,
  CASE 
    WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'habits')
    THEN '✓ habits table EXISTS'
    ELSE '✗ habits table MISSING'
  END as habits_status,
  CASE 
    WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'completions')
    THEN '✓ completions table EXISTS'
    ELSE '✗ completions table MISSING'
  END as completions_status;

-- ========================================
-- 2. Check Streak Columns in Habits Table
-- ========================================
SELECT 
  'COLUMN CHECK' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'habits' AND column_name = 'current_streak'
    )
    THEN '✓ current_streak column EXISTS'
    ELSE '✗ current_streak column MISSING'
  END as current_streak_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'habits' AND column_name = 'longest_streak'
    )
    THEN '✓ longest_streak column EXISTS'
    ELSE '✗ longest_streak column MISSING'
  END as longest_streak_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'habits' AND column_name = 'last_completed_date'
    )
    THEN '✓ last_completed_date column EXISTS'
    ELSE '✗ last_completed_date column MISSING'
  END as last_completed_date_status;

-- ========================================
-- 3. Check Streak Functions
-- ========================================
SELECT 
  'FUNCTION CHECK' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_streak')
    THEN '✓ get_current_streak function EXISTS'
    ELSE '✗ get_current_streak function MISSING'
  END as get_current_streak_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_longest_streak')
    THEN '✓ get_longest_streak function EXISTS'
    ELSE '✗ get_longest_streak function MISSING'
  END as get_longest_streak_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_habits_with_streaks')
    THEN '✓ get_habits_with_streaks function EXISTS'
    ELSE '✗ get_habits_with_streaks function MISSING'
  END as get_habits_with_streaks_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_top_streaks')
    THEN '✓ get_top_streaks function EXISTS'
    ELSE '✗ get_top_streaks function MISSING'
  END as get_top_streaks_status;

-- ========================================
-- 4. Check Views
-- ========================================
SELECT 
  'VIEW CHECK' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'user_statistics')
    THEN '✓ user_statistics view EXISTS'
    ELSE '✗ user_statistics view MISSING'
  END as user_statistics_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'user_dashboard_stats')
    THEN '✓ user_dashboard_stats view EXISTS'
    ELSE '✗ user_dashboard_stats view MISSING'
  END as user_dashboard_stats_status;

-- ========================================
-- 5. Check Indexes
-- ========================================
SELECT 
  'INDEX CHECK' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' AND tablename = 'completions' AND indexname = 'completions_user_habit_date_idx'
    )
    THEN '✓ completions_user_habit_date_idx index EXISTS'
    ELSE '✗ completions_user_habit_date_idx index MISSING'
  END as completion_index_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' AND tablename = 'completions' AND indexname = 'completions_user_idx'
    )
    THEN '✓ completions_user_idx index EXISTS'
    ELSE '✗ completions_user_idx index MISSING'
  END as user_index_status;

-- ========================================
-- 6. Summary - What's Missing
-- ========================================
SELECT 
  'SUMMARY' as report_type,
  'Run streak_tracking_setup.sql to create missing components' as action_needed
WHERE 
  NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_streak')
  OR NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_longest_streak')
  OR NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_habits_with_streaks')
  OR NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_top_streaks')
  OR NOT EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'user_dashboard_stats')
  OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'habits' AND column_name = 'last_completed_date'
  );

-- ========================================
-- 7. If Everything Exists, Test Queries
-- ========================================

-- If your user_id is known, replace 'YOUR-USER-ID-HERE' with actual UUID
-- Otherwise, use auth.uid() in your app

-- Example test query (uncomment and add your user_id):
-- SELECT * FROM public.get_habits_with_streaks('YOUR-USER-ID-HERE'::uuid);
-- SELECT * FROM public.get_top_streaks('YOUR-USER-ID-HERE'::uuid, 3);
-- SELECT * FROM public.user_dashboard_stats WHERE user_id = 'YOUR-USER-ID-HERE'::uuid;
