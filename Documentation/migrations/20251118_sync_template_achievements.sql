-- Migration: sync achievements with challenge template progress
-- Adds `target_template_id` to achievements and a trigger to update progress/unlock when user_challenges update

-- Add column to achievements to target a specific challenge template
ALTER TABLE IF EXISTS public.achievements
ADD COLUMN IF NOT EXISTS target_template_id UUID REFERENCES public.challenge_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_achievements_target_template ON public.achievements(target_template_id);

GRANT SELECT ON public.achievements TO authenticated;

-- Function: update progress and award achievement when a user challenge progresses or completes
CREATE OR REPLACE FUNCTION public.sync_template_achievement_progress()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  rec RECORD;
  v_progress INTEGER;
BEGIN
  -- Only handle updates where current_completions changed or status became completed
  IF TG_OP = 'UPDATE' AND (OLD.current_completions IS DISTINCT FROM NEW.current_completions OR (OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed')) THEN

    FOR rec IN
      SELECT a.id AS achievement_id, COALESCE(a.requirement_value, 0) AS req, COALESCE(a.points, 0) AS pts
      FROM public.achievements a
      WHERE a.target_template_id IS NOT NULL
        AND a.target_template_id = NEW.challenge_template_id
        AND a.requirement_type IN ('custom','streak_days','total_completions')
    LOOP
      -- Update progress (cap at requirement)
      v_progress := LEAST(NEW.current_completions, rec.req);

      INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at, progress)
      VALUES (NEW.user_id, rec.achievement_id, NULL, v_progress)
      ON CONFLICT (user_id, achievement_id) DO UPDATE
      SET progress = EXCLUDED.progress;

      -- If the user reached requirement, insert unlocked row (only once)
      IF NEW.current_completions >= rec.req AND rec.req > 0 THEN
        INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at, progress)
        SELECT NEW.user_id, rec.achievement_id, NOW(), rec.req
        WHERE NOT EXISTS (
          SELECT 1 FROM public.user_achievements ua WHERE ua.user_id = NEW.user_id AND ua.achievement_id = rec.achievement_id AND ua.unlocked_at IS NOT NULL
        );

        IF FOUND THEN
          -- Add points and increment achievements_unlocked
          UPDATE public.user_gamification
          SET total_points = total_points + rec.pts,
              achievements_unlocked = achievements_unlocked + 1,
              updated_at = NOW()
          WHERE user_id = NEW.user_id;
        END IF;
      END IF;

    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_template_achievement_progress() TO authenticated;

-- Trigger: run after updates to user_challenges
DROP TRIGGER IF EXISTS trg_sync_template_achievements ON public.user_challenges;
CREATE TRIGGER trg_sync_template_achievements
AFTER UPDATE OF current_completions, status ON public.user_challenges
FOR EACH ROW
WHEN (OLD.current_completions IS DISTINCT FROM NEW.current_completions OR (OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed'))
EXECUTE FUNCTION public.sync_template_achievement_progress();
