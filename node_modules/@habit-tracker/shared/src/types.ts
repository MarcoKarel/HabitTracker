// Shared types for the habit tracker application

export interface User {
  id: string;
  email: string;
  username?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  username?: string;
  created_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  frequency: number; // bitmask for days of week (1=Monday, 2=Tuesday, 4=Wednesday, etc.)
  start_date: string; // ISO date string
  color?: string; // Habit color for UI
  icon?: string; // Habit icon/emoji
  reminder_time?: string; // HH:MM format
  is_active?: boolean;
  created_at: string;
}

export interface HabitCompletion {
  id: string;
  habit_id: string;
  user_id: string;
  completed_at: string; // ISO date string
  created_at: string;
}

export interface HabitWithCompletions extends Habit {
  completions: HabitCompletion[];
  current_streak: number;
  longest_streak: number;
  completion_rate: number;
  last_completed?: string;
  is_due_today: boolean;
  is_completed_today: boolean;
}

// Frequency helpers
export const FREQUENCY_DAYS = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 4,
  THURSDAY: 8,
  FRIDAY: 16,
  SATURDAY: 32,
  SUNDAY: 64,
} as const;

export const FREQUENCY_PRESETS = {
  DAILY: 127, // All days (1+2+4+8+16+32+64)
  WEEKDAYS: 31, // Monday to Friday (1+2+4+8+16)
  WEEKENDS: 96, // Saturday and Sunday (32+64)
} as const;

// API Response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  count: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Auth types
export interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at?: string;
  last_sign_in_at?: string;
  created_at: string;
}

export interface SignUpData {
  email: string;
  password: string;
  username?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

// Settings types
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  notifications_enabled: boolean;
  reminder_time?: string; // HH:MM format
  export_format: 'csv' | 'json';
}

// Analytics types
export interface HabitStats {
  habit_id: string;
  total_completions: number;
  current_streak: number;
  longest_streak: number;
  completion_rate: number;
  weekly_completions: number[];
  monthly_completions: number[];
}

export interface DashboardStats {
  total_habits: number;
  completed_today: number;
  active_streaks: number;
  total_completions: number;
  completion_rate: number;
}

// Notification types
export interface NotificationSettings {
  enabled: boolean;
  time: string; // HH:MM format
  days_ahead: number;
}

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  scheduled_for: string;
}