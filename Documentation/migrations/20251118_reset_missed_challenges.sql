-- Migration: Add strict consecutive behavior and scheduled reset/fail on missed days
-- Adds columns to `user_challenges` and a function to detect missed expected completions
-- Run this in Supabase SQL editor. To run nightly, install/enable pg_cron or schedule via your platform.

ALTER TABLE IF EXISTS public.user_challenges
  ADD COLUMN IF NOT EXISTS strict_consecutive boolean DEFAULT FALSE;

ALTER TABLE IF EXISTS public.user_challenges
  ADD COLUMN IF NOT EXISTS on_miss_action text DEFAULT 'reset';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_challenges_on_miss_action_check'
  ) THEN
    ALTER TABLE public.user_challenges
      ADD CONSTRAINT user_challenges_on_miss_action_check CHECK (on_miss_action IN ('reset','fail'));
  END IF;
END$$;

-- Function: fail_or_reset_missed_challenges
-- Scans active user_challenges with strict_consecutive = true and determines whether
-- an expected completion was missed (supports daily and weekly frequencies).
-- If missed: either resets `current_completions` to 0 (action='reset') or marks status='failed' (action='fail').
CREATE OR REPLACE FUNCTION public.fail_or_reset_missed_challenges()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  rec RECORD;
  last_comp date;
  expected_miss boolean;
  freq jsonb;
  freq_type text;
  freq_days int[];
BEGIN
  FOR rec IN
    SELECT uc.id, uc.user_id, uc.habit_id, uc.start_date, uc.end_date, uc.on_miss_action, h.frequency
    FROM public.user_challenges uc
    JOIN public.habits h ON h.id = uc.habit_id
    WHERE uc.status = 'active'
      AND uc.strict_consecutive = TRUE
      AND uc.end_date >= CURRENT_DATE
  LOOP
    expected_miss := FALSE;
    freq := rec.frequency;

    SELECT MAX(c.date) INTO last_comp
    FROM public.completions c
    WHERE c.user_id = rec.user_id
      AND c.habit_id = rec.habit_id;

    -- determine frequency type
    freq_type := COALESCE((freq->> 'type')::text, 'daily');

    IF freq_type = 'daily' THEN
      -- If the last completion is before yesterday, we missed a day
      IF last_comp IS NULL THEN
        -- If we are past the start_date and no completion has been made for yesterday or earlier, treat as missed
        IF CURRENT_DATE > rec.start_date THEN
          expected_miss := TRUE;
        END IF;
      ELSE
        IF last_comp < (CURRENT_DATE - INTERVAL '1 day')::date THEN
          expected_miss := TRUE;
        END IF;
      END IF;

    ELSIF freq_type = 'weekly' THEN
      -- Weekly frequency expects completions on particular weekdays (days array)
      IF freq ? 'days' THEN
        SELECT array_agg((d::int)) INTO freq_days
        FROM jsonb_array_elements_text(freq->'days') d;

        IF freq_days IS NOT NULL AND array_length(freq_days,1) > 0 THEN
          -- Check if yesterday is one of the expected weekdays (Postgres DOW: 0=Sunday..6=Saturday)
          IF (EXTRACT(DOW FROM (CURRENT_DATE - INTERVAL '1 day'))::int) = ANY(freq_days) THEN
            IF last_comp IS NULL OR last_comp < (CURRENT_DATE - INTERVAL '1 day')::date THEN
              expected_miss := TRUE;
            END IF;
          END IF;
        END IF;
      END IF;
    END IF;

    IF expected_miss THEN
      IF rec.on_miss_action = 'fail' THEN
        UPDATE public.user_challenges SET status = 'failed', updated_at = NOW() WHERE id = rec.id;
      ELSE
        UPDATE public.user_challenges SET current_completions = 0, updated_at = NOW() WHERE id = rec.id;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Grant execute to a role if needed (run as an admin / owner in Supabase)
-- GRANT EXECUTE ON FUNCTION public.fail_or_reset_missed_challenges() TO authenticated;

-- Example pg_cron job (commented): schedule daily at 02:10 UTC
-- Requires installing/enabling the pg_cron extension in the database and proper permissions.
-- Uncomment and adjust schedule as needed if pg_cron is available:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('fail_missed_challenges_daily', '10 2 * * *', $$SELECT public.fail_or_reset_missed_challenges();$$);

-- Alternatively, call this function from an external scheduler (Cloud Function / GitHub Actions) daily:
-- e.g. curl to a server-side endpoint that runs the SQL: SELECT public.fail_or_reset_missed_challenges();
