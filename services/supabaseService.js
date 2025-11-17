import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../config/supabase';

// Initialize Supabase client using config or environment variables
const SUPABASE_URL = (typeof process !== 'undefined' && process.env && process.env.SUPABASE_URL) || supabaseConfig.url;
const SUPABASE_ANON_KEY = (typeof process !== 'undefined' && process.env && process.env.SUPABASE_ANON_KEY) || supabaseConfig.anonKey;

let supabase = null;
try {
  if (SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('YOUR_SUPABASE_URL_HERE')) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    console.warn('Supabase config placeholders detected. Initialize supabaseConfig or set SUPABASE_URL/SUPABASE_ANON_KEY env vars.');
  }
} catch (err) {
  console.warn('Failed to initialize Supabase client:', err.message || err);
}

// Auth functions
export const auth = {
  signUp: async (email, password, userData = {}) => {
    if (!supabase) throw new Error('Supabase not configured');

    // Sign up user using Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });

    if (error) return { data: null, error };

    // If signup created an active session, create the profile now.
    try {
      const sessionRes = await supabase.auth.getSession();
      const session = sessionRes?.data?.session;
      const user = session?.user || data.user || data;

      if (user && user.id && session) {
        const profile = {
          id: user.id,
          username: userData.username || email.split('@')[0],
          email,
        };

        const { error: profileError } = await supabase.from('profiles').insert(profile).select();
        if (profileError) {
          console.warn('Failed to create profile row after signup:', profileError.message || profileError);
          return { data, error: null, profileCreated: false, profileError };
        }

        return { data, error: null, profileCreated: true };
      }
      return { data, error: null, profileCreated: false, note: 'No active session; profile creation deferred until sign-in/confirmation.' };
    } catch (e) {
      console.warn('Error during post-signup profile flow:', e?.message || e);
      return { data, error: null, profileCreated: false, profileError: e };
    }
  },

  signIn: async (email, password) => {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { data: null, error };

    // Fetch profile and ensure it exists
    try {
      const user = data.user || (await supabase.auth.getUser()).data?.user;
      if (user && user.id) {
        const { data: profile, error: pErr } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (pErr || !profile) {
          // Create profile using authenticated session
          const profileRow = {
            id: user.id,
            username: user.user_metadata?.username || (user.email ? user.email.split('@')[0] : email.split('@')[0]),
            email: user.email || email,
          };
          const { data: upserted, error: upErr } = await supabase.from('profiles').upsert(profileRow).select().single();
          if (upErr) {
            console.warn('Failed to upsert profile after signIn:', upErr.message || upErr);
            return { data: { auth: data, profile: null }, error: null };
          }
          return { data: { auth: data, profile: upserted }, error: null };
        }
        return { data: { auth: data, profile }, error: null };
      }
    } catch (e) {
      console.warn('Error fetching/creating profile after signIn:', e?.message || e);
      return { data: { auth: data, profile: null }, error: null };
    }

    return { data, error: null };
  },

  signOut: async () => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getCurrentUser: () => {
    if (!supabase) return null;
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
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    return { data, error };
  },

  upsert: async (profile) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.from('profiles').upsert(profile).select().single();
    return { data, error };
  },

  isPremium: async (userId) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.rpc('is_user_premium', { p_user_id: userId });
    if (error) return { data: false, error };
    return { data: data || false, error: null };
  },

  getSubscriptionInfo: async (userId) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status, subscription_ends_at, is_premium')
      .eq('id', userId)
      .single();
    return { data, error };
  },

  updateSubscription: async (userId, subscriptionData) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('profiles')
      .update({
        subscription_tier: subscriptionData.tier,
        subscription_status: subscriptionData.status,
        subscription_ends_at: subscriptionData.endsAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();
    return { data, error };
  },
};

// Habits functions
export const habits = {
  getAll: async (userId) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.from('habits').select('*').eq('user_id', userId).eq('archived', false).order('created_at', { ascending: false });
    return { data, error };
  },

  create: async (habit) => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    // Check if user can create more habits
    const { data: canCreate, error: checkError } = await supabase.rpc('can_create_habit', { 
      p_user_id: habit.user_id 
    });
    
    if (checkError) {
      return { data: null, error: checkError };
    }
    
    if (!canCreate) {
      return { 
        data: null, 
        error: { 
          message: 'Habit limit reached. Upgrade to Premium to create unlimited habits!',
          code: 'HABIT_LIMIT_REACHED',
          isPremiumFeature: true
        } 
      };
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

  getHabitCount: async (userId) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.rpc('get_user_habit_count', { p_user_id: userId });
    return { data: data || 0, error };
  },

  getAnalytics: async (userId, habitId) => {
    if (!supabase) throw new Error('Supabase not configured');
    try {
      const { data, error } = await supabase.rpc('get_habit_analytics', {
        p_user_id: userId,
        p_habit_id: habitId
      });
      return { data: data?.[0] || null, error };
    } catch (error) {
      if (error.message?.includes('Premium feature')) {
        return { 
          data: null, 
          error: { 
            message: error.message,
            code: 'PREMIUM_FEATURE_REQUIRED',
            isPremiumFeature: true
          }
        };
      }
      return { data: null, error };
    }
  },
};

// Habit completions functions
export const habitCompletions = {
  getAll: async (userId, habitId = null, startDate = null, endDate = null) => {
    if (!supabase) throw new Error('Supabase not configured');
    let query = supabase.from('completions').select('*').eq('user_id', userId);
    if (habitId) query = query.eq('habit_id', habitId);
    if (startDate && endDate) query = query.gte('date', startDate).lte('date', endDate);
    const { data, error } = await query.order('date', { ascending: false });
    return { data, error };
  },

  create: async (completion) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('completions')
      .insert(completion)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase
      .from('completions')
      .delete()
      .eq('id', id);
    return { error };
  },

  // Delete by user_id, habit_id, and date
  deleteByHabitAndDate: async (userId, habitId, date) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase
      .from('completions')
      .delete()
      .eq('user_id', userId)
      .eq('habit_id', habitId)
      .eq('date', date);
    return { error };
  },

  getByDate: async (userId, date) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.from('completions').select('*').eq('user_id', userId).eq('date', date);
    return { data, error };
  },
};

// Habit categories functions (Premium)
export const habitCategories = {
  getAll: async (userId) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('habit_categories')
      .select('*')
      .eq('user_id', userId)
      .order('name');
    return { data, error };
  },

  create: async (category) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('habit_categories')
      .insert(category)
      .select()
      .single();
    return { data, error };
  },

  update: async (id, updates) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('habit_categories')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase
      .from('habit_categories')
      .delete()
      .eq('id', id);
    return { error };
  },
};

// Habit templates functions
export const habitTemplates = {
  getAll: async (isPremium = false) => {
    if (!supabase) throw new Error('Supabase not configured');
    let query = supabase.from('habit_templates').select('*').order('popularity', { ascending: false });
    
    if (!isPremium) {
      query = query.eq('is_premium', false);
    }
    
    const { data, error } = await query;
    return { data, error };
  },

  getRecommendations: async (userId) => {
    if (!supabase) throw new Error('Supabase not configured');
    try {
      const { data, error } = await supabase.rpc('get_habit_recommendations', {
        p_user_id: userId
      });
      return { data, error };
    } catch (error) {
      if (error.message?.includes('Premium feature')) {
        return { 
          data: null, 
          error: { 
            message: error.message,
            code: 'PREMIUM_FEATURE_REQUIRED',
            isPremiumFeature: true
          }
        };
      }
      return { data: null, error };
    }
  },
};

// Data export functions (Premium)
export const dataExport = {
  exportUserData: async (userId) => {
    if (!supabase) throw new Error('Supabase not configured');
    try {
      const { data, error } = await supabase.rpc('export_user_data', {
        p_user_id: userId
      });
      return { data, error };
    } catch (error) {
      if (error.message?.includes('Premium feature')) {
        return { 
          data: null, 
          error: { 
            message: error.message,
            code: 'PREMIUM_FEATURE_REQUIRED',
            isPremiumFeature: true
          }
        };
      }
      return { data: null, error };
    }
  },

  downloadAsJSON: (data, filename = 'habit_tracker_export.json') => {
    const jsonString = JSON.stringify(data, null, 2);
    return { data: jsonString, filename, mimeType: 'application/json' };
  },

  downloadAsCSV: (habits, completions, filename = 'habit_tracker_export.csv') => {
    // Convert habits to CSV
    let csv = 'Type,Date,Habit Name,Description,Category,Tags,Notes\n';
    
    habits?.forEach(habit => {
      const row = [
        'Habit',
        habit.created_at,
        habit.name,
        habit.description || '',
        habit.category_id || '',
        (habit.tags || []).join(';'),
        ''
      ].map(val => `"${val}"`).join(',');
      csv += row + '\n';
    });
    
    completions?.forEach(comp => {
      const habit = habits?.find(h => h.id === comp.habit_id);
      const row = [
        'Completion',
        comp.date,
        habit?.name || '',
        '',
        '',
        '',
        comp.note || ''
      ].map(val => `"${val}"`).join(',');
      csv += row + '\n';
    });
    
    return { data: csv, filename, mimeType: 'text/csv' };
  },
};

// Custom themes functions (Premium)
export const customThemes = {
  getAll: async (userId) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('custom_themes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  create: async (theme) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('custom_themes')
      .insert(theme)
      .select()
      .single();
    return { data, error };
  },

  update: async (id, updates) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('custom_themes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase
      .from('custom_themes')
      .delete()
      .eq('id', id);
    return { error };
  },

  setActive: async (userId, themeId) => {
    if (!supabase) throw new Error('Supabase not configured');
    
    // Deactivate all themes
    await supabase
      .from('custom_themes')
      .update({ is_active: false })
      .eq('user_id', userId);
    
    // Activate selected theme
    const { data, error } = await supabase
      .from('custom_themes')
      .update({ is_active: true })
      .eq('id', themeId)
      .eq('user_id', userId)
      .select()
      .single();
    
    return { data, error };
  },
};

// Habit photos functions (Premium)
export const habitPhotos = {
  getAll: async (userId, habitId = null) => {
    if (!supabase) throw new Error('Supabase not configured');
    let query = supabase
      .from('habit_photos')
      .select('*')
      .eq('user_id', userId)
      .order('taken_at', { ascending: false });
    
    if (habitId) {
      query = query.eq('habit_id', habitId);
    }
    
    const { data, error } = await query;
    return { data, error };
  },

  create: async (photo) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('habit_photos')
      .insert(photo)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase
      .from('habit_photos')
      .delete()
      .eq('id', id);
    return { error };
  },

  uploadPhoto: async (userId, habitId, fileUri, note = null) => {
    if (!supabase) throw new Error('Supabase not configured');
    
    // Convert file URI to blob for upload
    const response = await fetch(fileUri);
    const blob = await response.blob();
    
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const filePath = `habit-photos/${userId}/${habitId}/${fileName}`;
    
    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('habit-photos')
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: false,
      });
    
    if (uploadError) {
      return { data: null, error: uploadError };
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('habit-photos')
      .getPublicUrl(filePath);
    
    // Create photo record
    const { data: photoData, error: photoError } = await supabase
      .from('habit_photos')
      .insert({
        user_id: userId,
        habit_id: habitId,
        photo_url: publicUrl,
        note: note,
      })
      .select()
      .single();
    
    return { data: photoData, error: photoError };
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
          table: 'completions',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();
    
    return () => subscription.unsubscribe();
  },
};

export default supabase;
