import { createClient, SupabaseClient, AuthError } from '@supabase/supabase-js';
import type {
  Habit,
  HabitCompletion,
  Profile,
  SignUpData,
  SignInData,
  AuthUser,
  ApiResponse,
} from './types';

export class SupabaseAPI {
  private client: SupabaseClient;

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey);
  }

  // Auth methods
  async signUp(data: SignUpData): Promise<ApiResponse<AuthUser>> {
    try {
      const { data: authData, error } = await this.client.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      // Create profile if username provided
      if (data.username && authData.user) {
        await this.createProfile(authData.user.id, data.username);
      }

      return {
        data: authData.user as AuthUser,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: (error as AuthError).message,
        success: false,
      };
    }
  }

  async signIn(data: SignInData): Promise<ApiResponse<AuthUser>> {
    try {
      const { data: authData, error } = await this.client.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      return {
        data: authData.user as AuthUser,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: (error as AuthError).message,
        success: false,
      };
    }
  }

  async signOut(): Promise<ApiResponse<null>> {
    try {
      const { error } = await this.client.auth.signOut();
      if (error) throw error;

      return {
        data: null,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: (error as AuthError).message,
        success: false,
      };
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user } } = await this.client.auth.getUser();
    return user as AuthUser | null;
  }

  // Profile methods
  async createProfile(userId: string, username: string): Promise<ApiResponse<Profile>> {
    try {
      const { data, error } = await this.client
        .from('profiles')
        .insert([{ id: userId, username }])
        .select()
        .single();

      if (error) throw error;

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: (error as any).message,
        success: false,
      };
    }
  }

  async getProfile(userId: string): Promise<ApiResponse<Profile>> {
    try {
      const { data, error } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: (error as any).message,
        success: false,
      };
    }
  }

  // Habit methods
  async createHabit(habit: Omit<Habit, 'id' | 'created_at'>): Promise<ApiResponse<Habit>> {
    try {
      const { data, error } = await this.client
        .from('habits')
        .insert([habit])
        .select()
        .single();

      if (error) throw error;

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: (error as any).message,
        success: false,
      };
    }
  }

  async getHabits(userId: string): Promise<ApiResponse<Habit[]>> {
    try {
      const { data, error } = await this.client
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: (error as any).message,
        success: false,
      };
    }
  }

  async updateHabit(id: string, updates: Partial<Habit>): Promise<ApiResponse<Habit>> {
    try {
      const { data, error } = await this.client
        .from('habits')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: (error as any).message,
        success: false,
      };
    }
  }

  async deleteHabit(id: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await this.client
        .from('habits')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return {
        data: null,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: (error as any).message,
        success: false,
      };
    }
  }

  // Habit completion methods
  async createCompletion(completion: Omit<HabitCompletion, 'id' | 'created_at'>): Promise<ApiResponse<HabitCompletion>> {
    try {
      const { data, error } = await this.client
        .from('habit_completions')
        .insert([completion])
        .select()
        .single();

      if (error) throw error;

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: (error as any).message,
        success: false,
      };
    }
  }

  async getCompletions(userId: string, habitId?: string): Promise<ApiResponse<HabitCompletion[]>> {
    try {
      let query = this.client
        .from('habit_completions')
        .select('*')
        .eq('user_id', userId);

      if (habitId) {
        query = query.eq('habit_id', habitId);
      }

      const { data, error } = await query.order('completed_at', { ascending: false });

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: (error as any).message,
        success: false,
      };
    }
  }

  async deleteCompletion(id: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await this.client
        .from('habit_completions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return {
        data: null,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: (error as any).message,
        success: false,
      };
    }
  }

  // Real-time subscriptions
  subscribeToHabits(userId: string, callback: (habits: Habit[]) => void) {
    return this.client
      .channel('habits-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'habits',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Refetch habits when changes occur
          this.getHabits(userId).then(response => {
            if (response.success && response.data) {
              callback(response.data);
            }
          });
        }
      )
      .subscribe();
  }

  subscribeToCompletions(userId: string, callback: (completions: HabitCompletion[]) => void) {
    return this.client
      .channel('completions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'habit_completions',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Refetch completions when changes occur
          this.getCompletions(userId).then(response => {
            if (response.success && response.data) {
              callback(response.data);
            }
          });
        }
      )
      .subscribe();
  }

  // OAuth methods
  async signInWithGoogle(): Promise<ApiResponse<{ url: string }>> {
    try {
      const { data, error } = await this.client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: (typeof window !== 'undefined' && window?.location?.origin) || 'exp://127.0.0.1:19000/--/auth/callback',
        },
      });

      if (error) throw error;

      return {
        data: { url: data.url },
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: (error as AuthError).message,
        success: false,
      };
    }
  }

  async signInWithGitHub(): Promise<ApiResponse<{ url: string }>> {
    try {
      const { data, error } = await this.client.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: (typeof window !== 'undefined' && window?.location?.origin) || 'exp://127.0.0.1:19000/--/auth/callback',
        },
      });

      if (error) throw error;

      return {
        data: { url: data.url },
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: (error as AuthError).message,
        success: false,
      };
    }
  }
}