-- ============================================================================
-- EXTENDED PREMIUM FEATURES SCHEMA
-- New tables and functions for advanced premium features
-- ============================================================================

-- ============================================================================
-- 1. SOCIAL FEATURES
-- ============================================================================

-- Friend connections
CREATE TABLE IF NOT EXISTS friend_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

CREATE INDEX idx_friend_connections_user ON friend_connections(user_id);
CREATE INDEX idx_friend_connections_friend ON friend_connections(friend_id);
CREATE INDEX idx_friend_connections_status ON friend_connections(status);

-- Habit sharing (share specific habits with friends)
CREATE TABLE IF NOT EXISTS habit_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shared_with_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  can_view BOOLEAN DEFAULT TRUE,
  can_comment BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(habit_id, shared_with_id)
);

CREATE INDEX idx_habit_shares_habit ON habit_shares(habit_id);
CREATE INDEX idx_habit_shares_shared_with ON habit_shares(shared_with_id);

-- Comments on habits
CREATE TABLE IF NOT EXISTS habit_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_habit_comments_habit ON habit_comments(habit_id);
CREATE INDEX idx_habit_comments_user ON habit_comments(user_id);

-- Leaderboards (global and friend-only)
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'all_time')),
  score INTEGER DEFAULT 0,
  streak_count INTEGER DEFAULT 0,
  habits_completed INTEGER DEFAULT 0,
  rank INTEGER,
  period_start DATE NOT NULL,
  period_end DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, period, period_start)
);

CREATE INDEX idx_leaderboard_period ON leaderboard_entries(period);
CREATE INDEX idx_leaderboard_score ON leaderboard_entries(score DESC);
CREATE INDEX idx_leaderboard_rank ON leaderboard_entries(rank);

-- ============================================================================
-- 2. CHALLENGES & COMPETITIONS
-- ============================================================================

-- Challenge templates
CREATE TABLE IF NOT EXISTS challenge_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  duration_days INTEGER NOT NULL DEFAULT 30,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard', 'extreme')),
  category TEXT,
  icon TEXT,
  color TEXT,
  required_completions INTEGER DEFAULT 1,
  is_premium BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User challenges
CREATE TABLE IF NOT EXISTS user_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_template_id UUID REFERENCES challenge_templates(id) ON DELETE SET NULL,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  target_completions INTEGER NOT NULL DEFAULT 30,
  current_completions INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'abandoned')),
  reward_points INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_challenges_user ON user_challenges(user_id);
CREATE INDEX idx_user_challenges_status ON user_challenges(status);
CREATE INDEX idx_user_challenges_dates ON user_challenges(start_date, end_date);

-- Challenge participants (for group challenges)
CREATE TABLE IF NOT EXISTS challenge_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES user_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completions INTEGER DEFAULT 0,
  rank INTEGER,
  UNIQUE(challenge_id, user_id)
);

CREATE INDEX idx_challenge_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX idx_challenge_participants_user ON challenge_participants(user_id);

-- ============================================================================
-- 3. ACHIEVEMENTS & GAMIFICATION
-- ============================================================================

-- Achievement definitions
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  category TEXT CHECK (category IN ('streaks', 'completion', 'social', 'challenges', 'milestones')),
  tier TEXT CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  points INTEGER DEFAULT 0,
  requirement_type TEXT CHECK (requirement_type IN ('streak_days', 'total_completions', 'habit_count', 'challenge_wins', 'friend_count', 'custom')),
  requirement_value INTEGER,
  is_secret BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress INTEGER DEFAULT 0,
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_unlocked ON user_achievements(unlocked_at DESC);

-- User points and levels
CREATE TABLE IF NOT EXISTS user_gamification (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  level_progress DECIMAL(5,2) DEFAULT 0.00,
  total_streak_days INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  challenges_completed INTEGER DEFAULT 0,
  achievements_unlocked INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 4. AI COACHING & INSIGHTS
-- ============================================================================

-- AI-generated insights and recommendations
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  insight_type TEXT CHECK (insight_type IN ('pattern', 'recommendation', 'prediction', 'motivation', 'warning', 'celebration')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_insights_user ON ai_insights(user_id);
CREATE INDEX idx_ai_insights_habit ON ai_insights(habit_id);
CREATE INDEX idx_ai_insights_read ON ai_insights(is_read);
CREATE INDEX idx_ai_insights_created ON ai_insights(created_at DESC);

-- Personalized coaching goals
CREATE TABLE IF NOT EXISTS coaching_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goal_type TEXT CHECK (goal_type IN ('improve_consistency', 'increase_streak', 'add_habits', 'complete_challenge', 'custom')),
  title TEXT NOT NULL,
  description TEXT,
  target_value INTEGER,
  current_value INTEGER DEFAULT 0,
  deadline DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'abandoned')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_coaching_goals_user ON coaching_goals(user_id);
CREATE INDEX idx_coaching_goals_status ON coaching_goals(status);

-- ============================================================================
-- 5. INTEGRATIONS & SMART FEATURES
-- ============================================================================

-- Third-party integrations (Google Calendar, Fitbit, etc.)
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL CHECK (service_name IN ('google_calendar', 'apple_health', 'fitbit', 'strava', 'todoist', 'notion')),
  is_active BOOLEAN DEFAULT TRUE,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  settings JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, service_name)
);

CREATE INDEX idx_integrations_user ON integrations(user_id);
CREATE INDEX idx_integrations_service ON integrations(service_name);

-- Smart reminders with optimal timing
CREATE TABLE IF NOT EXISTS smart_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  optimal_time TIME,
  days_of_week INTEGER[] DEFAULT ARRAY[0,1,2,3,4,5,6],
  is_enabled BOOLEAN DEFAULT TRUE,
  success_rate DECIMAL(5,2) DEFAULT 0.00,
  times_triggered INTEGER DEFAULT 0,
  times_completed_after INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_smart_reminders_user ON smart_reminders(user_id);
CREATE INDEX idx_smart_reminders_habit ON smart_reminders(habit_id);

-- Habit dependencies (one habit must be done before another)
CREATE TABLE IF NOT EXISTS habit_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  depends_on_habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  dependency_type TEXT DEFAULT 'before' CHECK (dependency_type IN ('before', 'after', 'same_day')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(habit_id, depends_on_habit_id),
  CHECK (habit_id != depends_on_habit_id)
);

CREATE INDEX idx_habit_dependencies_habit ON habit_dependencies(habit_id);

-- ============================================================================
-- FUNCTIONS FOR NEW FEATURES
-- ============================================================================

-- Check if user can access social features
CREATE OR REPLACE FUNCTION can_access_social_features(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT is_user_premium(p_user_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get friends leaderboard
CREATE OR REPLACE FUNCTION get_friends_leaderboard(
  p_user_id UUID,
  p_period TEXT DEFAULT 'weekly'
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  score INTEGER,
  rank INTEGER,
  streak_count INTEGER,
  habits_completed INTEGER,
  is_current_user BOOLEAN
) AS $$
BEGIN
  -- Check premium status
  IF NOT is_user_premium(p_user_id) THEN
    RAISE EXCEPTION 'Premium feature required';
  END IF;

  RETURN QUERY
  SELECT 
    le.user_id,
    p.username,
    le.score,
    le.rank,
    le.streak_count,
    le.habits_completed,
    (le.user_id = p_user_id) as is_current_user
  FROM leaderboard_entries le
  JOIN profiles p ON le.user_id = p.id
  WHERE le.period = p_period
    AND le.period_start = (
      SELECT MAX(period_start) 
      FROM leaderboard_entries 
      WHERE period = p_period
    )
    AND (
      le.user_id = p_user_id
      OR le.user_id IN (
        SELECT friend_id FROM friend_connections 
        WHERE user_id = p_user_id AND status = 'accepted'
      )
      OR le.user_id IN (
        SELECT user_id FROM friend_connections 
        WHERE friend_id = p_user_id AND status = 'accepted'
      )
    )
  ORDER BY le.rank ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's active challenges
CREATE OR REPLACE FUNCTION get_user_active_challenges(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  start_date DATE,
  end_date DATE,
  target_completions INTEGER,
  current_completions INTEGER,
  progress_percentage DECIMAL,
  days_remaining INTEGER,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uc.id,
    uc.name,
    uc.description,
    uc.start_date,
    uc.end_date,
    uc.target_completions,
    uc.current_completions,
    ROUND((uc.current_completions::DECIMAL / NULLIF(uc.target_completions, 0) * 100), 2) as progress_percentage,
    (uc.end_date - CURRENT_DATE) as days_remaining,
    uc.status
  FROM user_challenges uc
  WHERE uc.user_id = p_user_id
    AND uc.status = 'active'
    AND uc.end_date >= CURRENT_DATE
  ORDER BY uc.end_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update challenge progress
CREATE OR REPLACE FUNCTION update_challenge_progress(
  p_challenge_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_target INTEGER;
  v_current INTEGER;
BEGIN
  UPDATE user_challenges
  SET 
    current_completions = current_completions + 1,
    updated_at = NOW()
  WHERE id = p_challenge_id
    AND user_id = p_user_id
  RETURNING target_completions, current_completions
  INTO v_target, v_current;

  -- Check if challenge is completed
  IF v_current >= v_target THEN
    UPDATE user_challenges
    SET status = 'completed'
    WHERE id = p_challenge_id;

    -- Award points
    UPDATE user_gamification
    SET 
      total_points = total_points + 500,
      challenges_completed = challenges_completed + 1
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get AI insights for user
CREATE OR REPLACE FUNCTION get_user_ai_insights(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  habit_id UUID,
  insight_type TEXT,
  title TEXT,
  message TEXT,
  priority TEXT,
  is_read BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Check premium status
  IF NOT is_user_premium(p_user_id) THEN
    RAISE EXCEPTION 'Premium feature required';
  END IF;

  RETURN QUERY
  SELECT 
    ai.id,
    ai.habit_id,
    ai.insight_type,
    ai.title,
    ai.message,
    ai.priority,
    ai.is_read,
    ai.created_at
  FROM ai_insights ai
  WHERE ai.user_id = p_user_id
    AND (ai.expires_at IS NULL OR ai.expires_at > NOW())
  ORDER BY 
    ai.is_read ASC,
    ai.priority DESC,
    ai.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate AI insight (simulated - in production, connect to OpenAI)
CREATE OR REPLACE FUNCTION generate_ai_insight(
  p_user_id UUID,
  p_habit_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_insight_id UUID;
  v_completion_rate DECIMAL;
  v_best_day TEXT;
  v_insight_title TEXT;
  v_insight_message TEXT;
BEGIN
  -- Check premium status
  IF NOT is_user_premium(p_user_id) THEN
    RAISE EXCEPTION 'Premium feature required';
  END IF;

  -- Calculate completion rate
  SELECT 
    ROUND(
      COUNT(CASE WHEN c.id IS NOT NULL THEN 1 END)::DECIMAL / 
      NULLIF(COUNT(*), 0) * 100, 
      1
    )
  INTO v_completion_rate
  FROM generate_series(
    NOW() - INTERVAL '30 days',
    NOW(),
    '1 day'
  ) AS date_series
  LEFT JOIN completions c ON 
    c.user_id = p_user_id 
    AND c.date = date_series::DATE
    AND (p_habit_id IS NULL OR c.habit_id = p_habit_id);

  -- Determine insight type and message
  IF v_completion_rate >= 80 THEN
    v_insight_title := '🎉 Amazing Progress!';
    v_insight_message := format('You''re crushing it with %s%% completion rate! Keep up the fantastic work!', v_completion_rate);
  ELSIF v_completion_rate >= 50 THEN
    v_insight_title := '💪 You''re Doing Great!';
    v_insight_message := format('You''ve maintained a %s%% completion rate. A few more consistent days will boost your streak!', v_completion_rate);
  ELSE
    v_insight_title := '🎯 Time to Refocus';
    v_insight_message := format('Your %s%% completion rate suggests room for improvement. Start with just one habit today!', v_completion_rate);
  END IF;

  -- Insert insight
  INSERT INTO ai_insights (
    user_id,
    habit_id,
    insight_type,
    title,
    message,
    priority,
    expires_at
  ) VALUES (
    p_user_id,
    p_habit_id,
    'motivation',
    v_insight_title,
    v_insight_message,
    CASE 
      WHEN v_completion_rate < 50 THEN 'high'
      WHEN v_completion_rate < 80 THEN 'medium'
      ELSE 'low'
    END,
    NOW() + INTERVAL '7 days'
  )
  RETURNING id INTO v_insight_id;

  RETURN v_insight_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user achievements progress
CREATE OR REPLACE FUNCTION get_user_achievements_progress(p_user_id UUID)
RETURNS TABLE (
  achievement_id UUID,
  name TEXT,
  description TEXT,
  icon TEXT,
  category TEXT,
  tier TEXT,
  points INTEGER,
  is_unlocked BOOLEAN,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  progress INTEGER,
  requirement_value INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as achievement_id,
    a.name,
    a.description,
    a.icon,
    a.category,
    a.tier,
    a.points,
    (ua.id IS NOT NULL) as is_unlocked,
    ua.unlocked_at,
    COALESCE(ua.progress, 0) as progress,
    a.requirement_value
  FROM achievements a
  LEFT JOIN user_achievements ua ON 
    ua.achievement_id = a.id 
    AND ua.user_id = p_user_id
  WHERE NOT a.is_secret OR ua.id IS NOT NULL
  ORDER BY 
    (ua.id IS NOT NULL) DESC,
    a.tier DESC,
    a.points DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update leaderboard (should be called via scheduled job)
CREATE OR REPLACE FUNCTION update_leaderboard(p_period TEXT DEFAULT 'weekly')
RETURNS VOID AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Determine period dates
  IF p_period = 'weekly' THEN
    v_start_date := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    v_end_date := v_start_date + INTERVAL '6 days';
  ELSIF p_period = 'monthly' THEN
    v_start_date := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    v_end_date := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
  ELSE
    v_start_date := '2020-01-01'::DATE;
    v_end_date := CURRENT_DATE;
  END IF;

  -- Insert or update leaderboard entries
  INSERT INTO leaderboard_entries (
    user_id,
    period,
    score,
    streak_count,
    habits_completed,
    period_start,
    period_end
  )
  SELECT 
    p.id as user_id,
    p_period as period,
    (
      COALESCE(COUNT(c.id), 0) * 10 + 
      COALESCE(MAX(s.current_streak), 0) * 5 +
      COALESCE(ug.total_points, 0)
    )::INTEGER as score,
    COALESCE(MAX(s.current_streak), 0) as streak_count,
    COALESCE(COUNT(c.id), 0)::INTEGER as habits_completed,
    v_start_date as period_start,
    v_end_date as period_end
  FROM profiles p
  LEFT JOIN completions c ON 
    c.user_id = p.id 
    AND c.date >= v_start_date 
    AND c.date <= v_end_date
  LEFT JOIN streak_tracking s ON s.user_id = p.id
  LEFT JOIN user_gamification ug ON ug.user_id = p.id
  GROUP BY p.id, ug.total_points
  ON CONFLICT (user_id, period, period_start)
  DO UPDATE SET
    score = EXCLUDED.score,
    streak_count = EXCLUDED.streak_count,
    habits_completed = EXCLUDED.habits_completed,
    updated_at = NOW();

  -- Update ranks
  WITH ranked AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY score DESC) as new_rank
    FROM leaderboard_entries
    WHERE period = p_period
      AND period_start = v_start_date
  )
  UPDATE leaderboard_entries le
  SET rank = ranked.new_rank
  FROM ranked
  WHERE le.id = ranked.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SEED DATA FOR ACHIEVEMENTS
-- ============================================================================

INSERT INTO achievements (name, description, icon, category, tier, points, requirement_type, requirement_value) VALUES
('First Step', 'Complete your first habit', 'footsteps', 'milestones', 'bronze', 10, 'total_completions', 1),
('Week Warrior', 'Maintain a 7-day streak', 'flame', 'streaks', 'bronze', 50, 'streak_days', 7),
('Month Master', 'Maintain a 30-day streak', 'rocket', 'streaks', 'silver', 200, 'streak_days', 30),
('Century Club', 'Maintain a 100-day streak', 'trophy', 'streaks', 'gold', 500, 'streak_days', 100),
('Legendary', 'Maintain a 365-day streak', 'star', 'streaks', 'diamond', 2000, 'streak_days', 365),
('Habit Builder', 'Create 5 habits', 'build', 'milestones', 'bronze', 25, 'habit_count', 5),
('Productivity Pro', 'Create 20 habits', 'briefcase', 'milestones', 'gold', 150, 'habit_count', 20),
('Century Completions', 'Complete habits 100 times', 'checkmark-circle', 'completion', 'silver', 100, 'total_completions', 100),
('Milestone 500', 'Complete habits 500 times', 'medal', 'completion', 'gold', 400, 'total_completions', 500),
('Social Butterfly', 'Add 5 friends', 'people', 'social', 'bronze', 30, 'friend_count', 5),
('Challenge Accepted', 'Complete your first challenge', 'ribbon', 'challenges', 'bronze', 75, 'challenge_wins', 1),
('Challenge Champion', 'Complete 10 challenges', 'podium', 'challenges', 'gold', 500, 'challenge_wins', 10)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SEED DATA FOR CHALLENGE TEMPLATES
-- ============================================================================

INSERT INTO challenge_templates (name, description, duration_days, difficulty, category, icon, color, required_completions, is_premium) VALUES
('30-Day Fitness Challenge', 'Exercise every day for 30 days', 30, 'medium', 'Health & Fitness', 'fitness', '#FF6B6B', 30, TRUE),
('7-Day Morning Routine', 'Establish a consistent morning routine', 7, 'easy', 'Productivity', 'sunny', '#4ECDC4', 7, FALSE),
('21-Day Meditation', 'Meditate daily for 21 days to build the habit', 21, 'easy', 'Mindfulness', 'leaf', '#95E1D3', 21, TRUE),
('60-Day Reading Sprint', 'Read for at least 30 minutes every day', 60, 'hard', 'Learning', 'book', '#AA96DA', 60, TRUE),
('14-Day Water Challenge', 'Drink 8 glasses of water daily', 14, 'easy', 'Health & Fitness', 'water', '#6BCF7F', 14, FALSE),
('90-Day Transformation', 'Complete your habit every single day', 90, 'extreme', 'Health & Fitness', 'barbell', '#F3A683', 90, TRUE),
('28-Day Gratitude Practice', 'Write 3 things you''re grateful for daily', 28, 'easy', 'Mindfulness', 'heart', '#FCBAD3', 28, TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE friend_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_dependencies ENABLE ROW LEVEL SECURITY;

-- Policies for friend_connections
CREATE POLICY "Users can view their own friend connections" ON friend_connections FOR SELECT USING (user_id = auth.uid() OR friend_id = auth.uid());
CREATE POLICY "Users can create friend connections" ON friend_connections FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own friend connections" ON friend_connections FOR UPDATE USING (user_id = auth.uid() OR friend_id = auth.uid());
CREATE POLICY "Users can delete their own friend connections" ON friend_connections FOR DELETE USING (user_id = auth.uid());

-- Policies for leaderboard (public read for premium users)
CREATE POLICY "Premium users can view leaderboard" ON leaderboard_entries FOR SELECT USING (is_user_premium(auth.uid()));

-- Policies for challenges
CREATE POLICY "Users can view their own challenges" ON user_challenges FOR SELECT USING (user_id = auth.uid() OR is_public = TRUE);
CREATE POLICY "Users can create challenges" ON user_challenges FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own challenges" ON user_challenges FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own challenges" ON user_challenges FOR DELETE USING (user_id = auth.uid());

-- Policies for achievements (read-only for everyone)
CREATE POLICY "Anyone can view achievements" ON achievements FOR SELECT USING (TRUE);
CREATE POLICY "Users can view their own achievements" ON user_achievements FOR SELECT USING (user_id = auth.uid());

-- Policies for gamification
CREATE POLICY "Users can view their own gamification data" ON user_gamification FOR SELECT USING (user_id = auth.uid());

-- Policies for AI insights
CREATE POLICY "Users can view their own AI insights" ON ai_insights FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their own AI insights" ON ai_insights FOR UPDATE USING (user_id = auth.uid());

-- Policies for coaching goals
CREATE POLICY "Users can manage their own coaching goals" ON coaching_goals FOR ALL USING (user_id = auth.uid());

-- Policies for integrations
CREATE POLICY "Users can manage their own integrations" ON integrations FOR ALL USING (user_id = auth.uid());

-- Policies for smart reminders
CREATE POLICY "Users can manage their own smart reminders" ON smart_reminders FOR ALL USING (user_id = auth.uid());

-- Policies for habit dependencies
CREATE POLICY "Users can manage their own habit dependencies" ON habit_dependencies FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_friend_connections_updated_at BEFORE UPDATE ON friend_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_challenges_updated_at BEFORE UPDATE ON user_challenges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_gamification_updated_at BEFORE UPDATE ON user_gamification FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_coaching_goals_updated_at BEFORE UPDATE ON coaching_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_smart_reminders_updated_at BEFORE UPDATE ON smart_reminders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE friend_connections IS 'Stores friend connections between users';
COMMENT ON TABLE user_challenges IS 'User-created challenges for habit building';
COMMENT ON TABLE achievements IS 'Achievement definitions for gamification';
COMMENT ON TABLE ai_insights IS 'AI-generated insights and recommendations';
COMMENT ON TABLE integrations IS 'Third-party service integrations';
