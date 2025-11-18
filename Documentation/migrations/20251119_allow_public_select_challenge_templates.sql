-- Migration: Allow public SELECT on challenge_templates
-- Adds a Row Level Security policy so anonymous clients can read challenge templates

ALTER TABLE IF EXISTS public.challenge_templates ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anon) to SELECT challenge templates (read-only)
-- DROP the policy first if it exists (safer for repeated runs), then create it.
DROP POLICY IF EXISTS "Public can view challenge templates" ON public.challenge_templates;
CREATE POLICY "Public can view challenge templates"
  ON public.challenge_templates
  FOR SELECT
  USING (TRUE);

-- Note: Be cautious when making tables publicly readable. Only allow this for static
-- reference data (templates) that contain no sensitive user information.
