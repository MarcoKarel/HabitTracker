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
    frequency: number;
    start_date: string;
    color?: string;
    icon?: string;
    reminder_time?: string;
    is_active?: boolean;
    created_at: string;
}
export interface HabitCompletion {
    id: string;
    habit_id: string;
    user_id: string;
    completed_at: string;
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
export declare const FREQUENCY_DAYS: {
    readonly MONDAY: 1;
    readonly TUESDAY: 2;
    readonly WEDNESDAY: 4;
    readonly THURSDAY: 8;
    readonly FRIDAY: 16;
    readonly SATURDAY: 32;
    readonly SUNDAY: 64;
};
export declare const FREQUENCY_PRESETS: {
    readonly DAILY: 127;
    readonly WEEKDAYS: 31;
    readonly WEEKENDS: 96;
};
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
export interface AppSettings {
    theme: 'light' | 'dark' | 'system';
    notifications_enabled: boolean;
    reminder_time?: string;
    export_format: 'csv' | 'json';
}
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
export interface NotificationSettings {
    enabled: boolean;
    time: string;
    days_ahead: number;
}
export interface PushNotification {
    id: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    scheduled_for: string;
}
