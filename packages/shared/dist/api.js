import { createClient } from '@supabase/supabase-js';
export class SupabaseAPI {
    constructor(url, anonKey) {
        this.client = createClient(url, anonKey);
    }
    // Auth methods
    async signUp(data) {
        try {
            const { data: authData, error } = await this.client.auth.signUp({
                email: data.email,
                password: data.password,
            });
            if (error)
                throw error;
            // Create profile if username provided
            if (data.username && authData.user) {
                await this.createProfile(authData.user.id, data.username);
            }
            return {
                data: authData.user,
                error: null,
                success: true,
            };
        }
        catch (error) {
            return {
                data: null,
                error: error.message,
                success: false,
            };
        }
    }
    async signIn(data) {
        try {
            const { data: authData, error } = await this.client.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });
            if (error)
                throw error;
            return {
                data: authData.user,
                error: null,
                success: true,
            };
        }
        catch (error) {
            return {
                data: null,
                error: error.message,
                success: false,
            };
        }
    }
    async signOut() {
        try {
            const { error } = await this.client.auth.signOut();
            if (error)
                throw error;
            return {
                data: null,
                error: null,
                success: true,
            };
        }
        catch (error) {
            return {
                data: null,
                error: error.message,
                success: false,
            };
        }
    }
    async getCurrentUser() {
        const { data: { user } } = await this.client.auth.getUser();
        return user;
    }
    // Profile methods
    async createProfile(userId, username) {
        try {
            const { data, error } = await this.client
                .from('profiles')
                .insert([{ id: userId, username }])
                .select()
                .single();
            if (error)
                throw error;
            return {
                data,
                error: null,
                success: true,
            };
        }
        catch (error) {
            return {
                data: null,
                error: error.message,
                success: false,
            };
        }
    }
    async getProfile(userId) {
        try {
            const { data, error } = await this.client
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            if (error)
                throw error;
            return {
                data,
                error: null,
                success: true,
            };
        }
        catch (error) {
            return {
                data: null,
                error: error.message,
                success: false,
            };
        }
    }
    // Habit methods
    async createHabit(habit) {
        try {
            const { data, error } = await this.client
                .from('habits')
                .insert([habit])
                .select()
                .single();
            if (error)
                throw error;
            return {
                data,
                error: null,
                success: true,
            };
        }
        catch (error) {
            return {
                data: null,
                error: error.message,
                success: false,
            };
        }
    }
    async getHabits(userId) {
        try {
            const { data, error } = await this.client
                .from('habits')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (error)
                throw error;
            return {
                data: data || [],
                error: null,
                success: true,
            };
        }
        catch (error) {
            return {
                data: null,
                error: error.message,
                success: false,
            };
        }
    }
    async updateHabit(id, updates) {
        try {
            const { data, error } = await this.client
                .from('habits')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error)
                throw error;
            return {
                data,
                error: null,
                success: true,
            };
        }
        catch (error) {
            return {
                data: null,
                error: error.message,
                success: false,
            };
        }
    }
    async deleteHabit(id) {
        try {
            const { error } = await this.client
                .from('habits')
                .delete()
                .eq('id', id);
            if (error)
                throw error;
            return {
                data: null,
                error: null,
                success: true,
            };
        }
        catch (error) {
            return {
                data: null,
                error: error.message,
                success: false,
            };
        }
    }
    // Habit completion methods
    async createCompletion(completion) {
        try {
            const { data, error } = await this.client
                .from('habit_completions')
                .insert([completion])
                .select()
                .single();
            if (error)
                throw error;
            return {
                data,
                error: null,
                success: true,
            };
        }
        catch (error) {
            return {
                data: null,
                error: error.message,
                success: false,
            };
        }
    }
    async getCompletions(userId, habitId) {
        try {
            let query = this.client
                .from('habit_completions')
                .select('*')
                .eq('user_id', userId);
            if (habitId) {
                query = query.eq('habit_id', habitId);
            }
            const { data, error } = await query.order('completed_at', { ascending: false });
            if (error)
                throw error;
            return {
                data: data || [],
                error: null,
                success: true,
            };
        }
        catch (error) {
            return {
                data: null,
                error: error.message,
                success: false,
            };
        }
    }
    async deleteCompletion(id) {
        try {
            const { error } = await this.client
                .from('habit_completions')
                .delete()
                .eq('id', id);
            if (error)
                throw error;
            return {
                data: null,
                error: null,
                success: true,
            };
        }
        catch (error) {
            return {
                data: null,
                error: error.message,
                success: false,
            };
        }
    }
    // Real-time subscriptions
    subscribeToHabits(userId, callback) {
        return this.client
            .channel('habits-changes')
            .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'habits',
            filter: `user_id=eq.${userId}`,
        }, () => {
            // Refetch habits when changes occur
            this.getHabits(userId).then(response => {
                if (response.success && response.data) {
                    callback(response.data);
                }
            });
        })
            .subscribe();
    }
    subscribeToCompletions(userId, callback) {
        return this.client
            .channel('completions-changes')
            .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'habit_completions',
            filter: `user_id=eq.${userId}`,
        }, () => {
            // Refetch completions when changes occur
            this.getCompletions(userId).then(response => {
                if (response.success && response.data) {
                    callback(response.data);
                }
            });
        })
            .subscribe();
    }
    // OAuth methods
    async signInWithGoogle() {
        try {
            const { data, error } = await this.client.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: (typeof window !== 'undefined' && window?.location?.origin) || 'exp://127.0.0.1:19000/--/auth/callback',
                },
            });
            if (error)
                throw error;
            return {
                data: { url: data.url },
                error: null,
                success: true,
            };
        }
        catch (error) {
            return {
                data: null,
                error: error.message,
                success: false,
            };
        }
    }
    async signInWithGitHub() {
        try {
            const { data, error } = await this.client.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: (typeof window !== 'undefined' && window?.location?.origin) || 'exp://127.0.0.1:19000/--/auth/callback',
                },
            });
            if (error)
                throw error;
            return {
                data: { url: data.url },
                error: null,
                success: true,
            };
        }
        catch (error) {
            return {
                data: null,
                error: error.message,
                success: false,
            };
        }
    }
}
