# Habit Tracker - Supabase Configuration

This directory contains the database schema and configuration for the Habit Tracker application.

## Setup Instructions

1. **Create a Supabase project**: 
   - Go to [https://supabase.com](https://supabase.com)
   - Create a new project
   - Note down your project URL and anon key

2. **Install Supabase CLI** (optional but recommended):
   ```bash
   npm install -g supabase
   ```

3. **Initialize Supabase** (if using CLI):
   ```bash
   supabase init
   ```

4. **Apply migrations**:
   - Option A: Using CLI:
     ```bash
     supabase db push
     ```
   - Option B: Manually copy the SQL from `migrations/001_initial_schema.sql` and run it in the Supabase SQL Editor

5. **Configure authentication**:
   - Go to Authentication > Settings in your Supabase dashboard
   - Enable email authentication
   - Optionally enable OAuth providers (Google, GitHub)
   - Set up redirect URLs for your apps:
     - Web: `http://localhost:5173/auth/callback`
     - Mobile: `exp://127.0.0.1:19000/--/auth/callback`

6. **Environment variables**:
   Create `.env` files in your app directories with:
   ```
   REACT_APP_SUPABASE_URL=your-project-url
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key
   ```

## Database Schema Overview

### Tables

- **profiles**: User profile information
- **habits**: Habit definitions with frequency, color, and settings
- **habit_completions**: Records of completed habits
- **user_settings**: User preferences and app settings

### Key Features

- **Row Level Security (RLS)**: All tables have RLS enabled with policies ensuring users can only access their own data
- **Automatic triggers**: User profiles and settings are created automatically on signup
- **Performance indexes**: Optimized queries for common operations
- **Analytics view**: Pre-computed habit statistics for dashboards

### Frequency System

Habits use a bitmask system for frequency:
- 1 = Monday
- 2 = Tuesday  
- 4 = Wednesday
- 8 = Thursday
- 16 = Friday
- 32 = Saturday
- 64 = Sunday

Examples:
- Daily: 127 (all days)
- Weekdays: 31 (Monday-Friday)
- Weekends: 96 (Saturday-Sunday)

## Real-time Features

The database is configured for real-time subscriptions:
- Habit changes are broadcast to connected clients
- Completion updates trigger real-time UI updates
- Optimistic updates with server reconciliation