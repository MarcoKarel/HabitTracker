import type { Habit, HabitCompletion, Profile, SignUpData, SignInData, AuthUser, ApiResponse } from './types';
export declare class SupabaseAPI {
    private client;
    constructor(url: string, anonKey: string);
    signUp(data: SignUpData): Promise<ApiResponse<AuthUser>>;
    signIn(data: SignInData): Promise<ApiResponse<AuthUser>>;
    signOut(): Promise<ApiResponse<null>>;
    getCurrentUser(): Promise<AuthUser | null>;
    createProfile(userId: string, username: string): Promise<ApiResponse<Profile>>;
    getProfile(userId: string): Promise<ApiResponse<Profile>>;
    createHabit(habit: Omit<Habit, 'id' | 'created_at'>): Promise<ApiResponse<Habit>>;
    getHabits(userId: string): Promise<ApiResponse<Habit[]>>;
    updateHabit(id: string, updates: Partial<Habit>): Promise<ApiResponse<Habit>>;
    deleteHabit(id: string): Promise<ApiResponse<null>>;
    createCompletion(completion: Omit<HabitCompletion, 'id' | 'created_at'>): Promise<ApiResponse<HabitCompletion>>;
    getCompletions(userId: string, habitId?: string): Promise<ApiResponse<HabitCompletion[]>>;
    deleteCompletion(id: string): Promise<ApiResponse<null>>;
    subscribeToHabits(userId: string, callback: (habits: Habit[]) => void): import("@supabase/supabase-js").RealtimeChannel;
    subscribeToCompletions(userId: string, callback: (completions: HabitCompletion[]) => void): import("@supabase/supabase-js").RealtimeChannel;
    signInWithGoogle(): Promise<ApiResponse<{
        url: string;
    }>>;
    signInWithGitHub(): Promise<ApiResponse<{
        url: string;
    }>>;
}
