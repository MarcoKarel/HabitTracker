-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  avatar_url text,
  full_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create habits table
create table if not exists public.habits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null check (char_length(title) >= 2 and char_length(title) <= 100),
  description text,
  frequency int not null check (frequency > 0 and frequency <= 127), -- bitmask for days of week
  start_date date not null default current_date,
  color text default '#3B82F6', -- Default blue color
  icon text default '🎯', -- Default target emoji
  reminder_time time, -- Optional reminder time (HH:MM format)
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create habit completions table
create table if not exists public.habit_completions (
  id uuid primary key default uuid_generate_v4(),
  habit_id uuid references public.habits(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  completed_at date not null,
  notes text,
  created_at timestamptz default now(),
  unique(habit_id, completed_at)
);

-- Create app settings table for user preferences
create table if not exists public.user_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  theme text default 'system' check (theme in ('light', 'dark', 'system')),
  notifications_enabled boolean default true,
  reminder_time time default '09:00:00',
  timezone text default 'UTC',
  first_day_of_week int default 1 check (first_day_of_week >= 0 and first_day_of_week <= 6), -- 0 = Sunday, 1 = Monday
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes for better performance
create index if not exists idx_habits_user_id on public.habits(user_id);
create index if not exists idx_habits_start_date on public.habits(start_date);
create index if not exists idx_habit_completions_habit_id on public.habit_completions(habit_id);
create index if not exists idx_habit_completions_user_id on public.habit_completions(user_id);
create index if not exists idx_habit_completions_completed_at on public.habit_completions(completed_at);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;
alter table public.user_settings enable row level security;

-- Profiles policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Habits policies
create policy "Users can view own habits"
  on public.habits for select
  using (auth.uid() = user_id);

create policy "Users can create own habits"
  on public.habits for insert
  with check (auth.uid() = user_id);

create policy "Users can update own habits"
  on public.habits for update
  using (auth.uid() = user_id);

create policy "Users can delete own habits"
  on public.habits for delete
  using (auth.uid() = user_id);

-- Habit completions policies
create policy "Users can view own completions"
  on public.habit_completions for select
  using (auth.uid() = user_id);

create policy "Users can create own completions"
  on public.habit_completions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own completions"
  on public.habit_completions for update
  using (auth.uid() = user_id);

create policy "Users can delete own completions"
  on public.habit_completions for delete
  using (auth.uid() = user_id);

-- User settings policies
create policy "Users can view own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can create own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);

-- Create functions for automated tasks

-- Function to automatically create user profile and settings on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  
  insert into public.user_settings (user_id)
  values (new.id);
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile and settings on user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger handle_habits_updated_at
  before update on public.habits
  for each row execute procedure public.handle_updated_at();

create trigger handle_user_settings_updated_at
  before update on public.user_settings
  for each row execute procedure public.handle_updated_at();

-- Views for analytics and reporting

-- View for habit statistics
create or replace view public.habit_stats as
select 
  h.id as habit_id,
  h.user_id,
  h.title,
  h.start_date,
  count(hc.id) as total_completions,
  count(case when hc.completed_at >= current_date - interval '7 days' then 1 end) as completions_last_7_days,
  count(case when hc.completed_at >= current_date - interval '30 days' then 1 end) as completions_last_30_days,
  max(hc.completed_at) as last_completion_date,
  case 
    when count(hc.id) = 0 then 0
    else round(
      (count(hc.id)::float / 
       greatest(1, current_date - h.start_date + 1)) * 100, 2
    )
  end as overall_completion_rate
from public.habits h
left join public.habit_completions hc on h.id = hc.habit_id
where h.is_active = true
group by h.id, h.user_id, h.title, h.start_date;

-- Grant permissions for the view
grant select on public.habit_stats to authenticated;

-- RLS policy for the view
create policy "Users can view own habit stats"
  on public.habit_stats for select
  using (auth.uid() = user_id);