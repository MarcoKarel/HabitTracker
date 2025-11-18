-- Migration: add template_id to habits so habits can be created from challenge templates
ALTER TABLE IF EXISTS public.habits
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.challenge_templates(id) ON DELETE SET NULL;

-- Index for quick lookup of habits created from templates
CREATE INDEX IF NOT EXISTS idx_habits_template_id ON public.habits(template_id);

-- Grant select to authenticated role (if needed)
GRANT SELECT ON public.habits TO authenticated;
