-- Migration: call update_challenge_progress when a completion is inserted
-- This ensures user_challenges progress increments automatically when a user marks a habit complete.

CREATE OR REPLACE FUNCTION public.on_completion_insert_update_challenges()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  rc RECORD;
BEGIN
  -- For each active user_challenge that matches this user and habit, call the existing update_challenge_progress function
  FOR rc IN
    SELECT id
    FROM public.user_challenges
    WHERE user_id = NEW.user_id
      AND habit_id = NEW.habit_id
      AND status = 'active'
      AND NEW.date BETWEEN start_date AND end_date
  LOOP
    PERFORM update_challenge_progress(rc.id, NEW.user_id);
  END LOOP;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.on_completion_insert_update_challenges() TO authenticated;

DROP TRIGGER IF EXISTS trg_completion_insert_update_challenges ON public.completions;
CREATE TRIGGER trg_completion_insert_update_challenges
AFTER INSERT ON public.completions
FOR EACH ROW
EXECUTE FUNCTION public.on_completion_insert_update_challenges();
