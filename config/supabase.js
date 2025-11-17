// Supabase Configuration
// This file reads values from multiple sources to work in Node, Expo, and
// environments where process.env is not available at runtime.
import Constants from 'expo-constants';

const runtimeExtra = (Constants && (Constants.expoConfig?.extra || Constants.manifest?.extra)) || {};

const SUPABASE_URL = (typeof process !== 'undefined' && process.env && process.env.SUPABASE_URL)
  || runtimeExtra.SUPABASE_URL
  || 'YOUR_SUPABASE_URL_HERE';

const SUPABASE_ANON_KEY = (typeof process !== 'undefined' && process.env && process.env.SUPABASE_ANON_KEY)
  || runtimeExtra.SUPABASE_ANON_KEY
  || 'YOUR_SUPABASE_ANON_KEY_HERE';

export const supabaseConfig = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
};

// Database Table Schemas (for reference)
export const dbSchemas = {
  // Users table (handled by Supabase Auth)
  users: {
    id: 'uuid (primary key)',
    email: 'text',
    created_at: 'timestamp',
    // Custom fields will be in user_profiles
  },

  // User profiles table
  user_profiles: {
    id: 'uuid (primary key, references auth.users)',
    username: 'text',
    profile_image_url: 'text',
    created_at: 'timestamp',
    updated_at: 'timestamp',
  },

  // Habits table
  habits: {
    id: 'uuid (primary key)',
    user_id: 'uuid (references auth.users)',
    name: 'text',
    description: 'text',
    notifications: 'jsonb', // Store notification settings
    created_at: 'timestamp',
    updated_at: 'timestamp',
  },

  // Habit completions table
  habit_completions: {
    id: 'uuid (primary key)',
    user_id: 'uuid (references auth.users)',
    habit_id: 'uuid (references habits)',
    completed_at: 'timestamp',
    completion_date: 'date', // For easy querying by date
  },
};

// SQL for creating tables (run these in Supabase SQL Editor)
export const createTablesSQL = `
-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create user_profiles table
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create habits table
CREATE TABLE habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  notifications JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create habit_completions table
CREATE TABLE habit_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completion_date DATE DEFAULT CURRENT_DATE
);

-- Row Level Security Policies

-- User profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Habits policies
CREATE POLICY "Users can view own habits" ON habits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habits" ON habits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habits" ON habits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own habits" ON habits
  FOR DELETE USING (auth.uid() = user_id);

-- Habit completions policies
CREATE POLICY "Users can view own completions" ON habit_completions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completions" ON habit_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own completions" ON habit_completions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own completions" ON habit_completions
  FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;

-- Function to handle user profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
`;