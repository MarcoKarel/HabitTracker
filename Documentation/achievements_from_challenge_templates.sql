-- Create achievements from challenge templates (idempotent)
-- Run this in Supabase SQL editor. It creates one achievement per template
-- and keeps requirement_value in sync for existing ones.

-- Insert new achievements for templates that don't yet have a linked achievement
INSERT INTO public.achievements (
  id, name, description, icon, category, tier, points, requirement_type, requirement_value, target_template_id, created_at
)
SELECT
  gen_random_uuid() as id,
  ('Complete: ' || ct.name) as name,
  ct.description,
  ct.icon,
  'challenges' as category,
  'bronze' as tier,
  GREATEST(10, COALESCE(ct.required_completions, ct.duration_days) * 10) as points,
  'custom' as requirement_type,
  COALESCE(ct.required_completions, ct.duration_days) as requirement_value,
  ct.id as target_template_id,
  NOW() as created_at
FROM public.challenge_templates ct
WHERE NOT EXISTS (
  SELECT 1 FROM public.achievements a WHERE a.target_template_id = ct.id
)
ON CONFLICT (name) DO NOTHING;

-- Update existing achievements that are already linked to templates if the template's required_completions changed
UPDATE public.achievements a
SET
  description = ct.description,
  icon = ct.icon,
  points = GREATEST(10, COALESCE(ct.required_completions, ct.duration_days) * 10),
  requirement_value = COALESCE(ct.required_completions, ct.duration_days)
FROM public.challenge_templates ct
WHERE a.target_template_id = ct.id
  AND (a.requirement_value IS DISTINCT FROM COALESCE(ct.required_completions, ct.duration_days)
       OR a.description IS DISTINCT FROM ct.description
       OR a.icon IS DISTINCT FROM ct.icon);

-- Quick check: show template -> achievement mapping
SELECT ct.id AS template_id, ct.name AS template_name, a.id AS achievement_id, a.name AS achievement_name, a.requirement_value
FROM public.challenge_templates ct
LEFT JOIN public.achievements a ON a.target_template_id = ct.id
ORDER BY ct.name;
