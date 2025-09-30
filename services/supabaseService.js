import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from './supabase';

// Initialize Supabase client
// Make sure to update the config/supabase.js file with your actual credentials
let supabase = null;

try {
  if (supabaseConfig.url !== 'YOUR_SUPABASE_URL_HERE' && 
      supabaseConfig.anonKey !== 'YOUR_SUPABASE_ANON_KEY_HERE') {
    supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);
  }
} catch (error) {
  console.warn('Supabase not configured yet. Using local storage fallback.');
}

// Auth functions
export const auth = {
  signUp: async (email, password, userData = {}) => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });
    
    return { data, error };
  },

  signIn: async (email, password) => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { data, error };
  },

  signOut: async () => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getCurrentUser: () => {
    if (!supabase) {
      return null;
    }
    
    return supabase.auth.getUser();
  },

  onAuthStateChange: (callback) => {
    if (!supabase) {
      return () => {};
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return () => subscription?.unsubscribe();
  },
};

// User profile functions
export const userProfiles = {
  get: async (userId) => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    return { data, error };
  },

  upsert: async (profile) => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(profile)
      .select()
      .single();
    
    return { data, error };
  },
};

// Habits functions
export const habits = {
  getAll: async (userId) => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    return { data, error };
  },

  create: async (habit) => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { data, error } = await supabase
      .from('habits')
      .insert(habit)
      .select()
      .single();
    
    return { data, error };
  },

  update: async (id, updates) => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { data, error } = await supabase
      .from('habits')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  },

  delete: async (id) => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { error } = await supabase
      .from('habits')
      .delete()
      .eq('id', id);
    
    return { error };
  },
};

// Habit completions functions
export const habitCompletions = {
  getAll: async (userId, habitId = null, startDate = null, endDate = null) => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    let query = supabase
      .from('habit_completions')
      .select('*')
      .eq('user_id', userId);
    
    if (habitId) {
      query = query.eq('habit_id', habitId);
    }
    
    if (startDate && endDate) {
      query = query.gte('completion_date', startDate).lte('completion_date', endDate);
    }
    
    const { data, error } = await query.order('completed_at', { ascending: false });
    
    return { data, error };
  },

  create: async (completion) => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { data, error } = await supabase
      .from('habit_completions')
      .insert(completion)
      .select()
      .single();
    
    return { data, error };
  },

  delete: async (userId, habitId, completionDate) => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { error } = await supabase
      .from('habit_completions')
      .delete()
      .eq('user_id', userId)
      .eq('habit_id', habitId)
      .eq('completion_date', completionDate);
    
    return { error };
  },

  getByDate: async (userId, date) => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { data, error } = await supabase
      .from('habit_completions')
      .select('*')
      .eq('user_id', userId)
      .eq('completion_date', date);
    
    return { data, error };
  },
};

// File upload functions (for profile pictures)
export const storage = {
  uploadProfileImage: async (userId, fileUri, fileName) => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    // Convert file URI to blob for upload
    const response = await fetch(fileUri);
    const blob = await response.blob();
    
    const filePath = `profiles/${userId}/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('profile-images')
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: true,
      });
    
    if (error) {
      return { data: null, error };
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filePath);
    
    return { data: { ...data, publicUrl }, error: null };
  },

  deleteProfileImage: async (filePath) => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { error } = await supabase.storage
      .from('profile-images')
      .remove([filePath]);
    
    return { error };
  },
};

// Real-time subscriptions
export const subscriptions = {
  subscribeToHabits: (userId, callback) => {
    if (!supabase) {
      return () => {};
    }
    
    const subscription = supabase
      .channel('habits')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'habits',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();
    
    return () => subscription.unsubscribe();
  },

  subscribeToCompletions: (userId, callback) => {
    if (!supabase) {
      return () => {};
    }
    
    const subscription = supabase
      .channel('completions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'habit_completions',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();
    
    return () => subscription.unsubscribe();
  },
};

export { supabase };
export default supabase;