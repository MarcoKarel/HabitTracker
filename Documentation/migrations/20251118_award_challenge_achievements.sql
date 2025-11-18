-- Migration: award achievements when a user completes a challenge
-- Creates a helper to award 'challenge_wins' achievements and a trigger

-- Function: award achievements for challenge wins
CREATE OR REPLACE FUNCTION public.award_challenge_win_achievements(p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_wins integer := 0;
  v_rec record;
  v_awarded_count integer := 0;
  v_total_points integer := 0;
BEGIN
  SELECT COUNT(*) INTO v_wins FROM public.user_challenges WHERE user_id = p_user AND status = 'completed';

  FOR v_rec IN
    SELECT a.id AS achievement_id, COALESCE(a.points, 0) AS points
    FROM public.achievements a
    WHERE a.requirement_type = 'challenge_wins'
      AND COALESCE(a.requirement_value, 0) <= v_wins
  LOOP
    -- Idempotent insert
    INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at, progress)
    VALUES (p_user, v_rec.achievement_id, NOW(), 0)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;

    IF FOUND THEN
      v_awarded_count := v_awarded_count + 1;
      v_total_points := v_total_points + v_rec.points;
    END IF;
  END LOOP;

  IF v_awarded_count > 0 THEN
    -- Update user gamification totals
    UPDATE public.user_gamification
    SET total_points = total_points + v_total_points,
        achievements_unlocked = achievements_unlocked + v_awarded_count,
        updated_at = NOW()
    WHERE user_id = p_user;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_challenge_win_achievements(uuid) TO authenticated;

-- Trigger function: call award function when a challenge flips to completed
CREATE OR REPLACE FUNCTION public.on_user_challenge_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM 'completed') AND (NEW.status = 'completed') THEN
    PERFORM public.award_challenge_win_achievements(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_challenge_completed ON public.user_challenges;
CREATE TRIGGER trg_user_challenge_completed
AFTER UPDATE OF status ON public.user_challenges
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed')
EXECUTE FUNCTION public.on_user_challenge_completed();
