// Subscription table functions
export const subscriptionTable = {
  create: async ({ user_id, provider, provider_subscription_id, plan, status }) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id,
        provider,
        provider_subscription_id,
        plan,
        status,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    return { data, error };
  },
  getByUser: async (user_id) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });
    return { data, error };
  },
};
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

  createFromTemplate: async (userId, templateId) => {
    if (!supabase) throw new Error('Supabase not configured');

    // Fetch the template
    const { data: tpl, error: tplErr } = await supabase
      .from('challenge_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (tplErr || !tpl) {
      return { data: null, error: tplErr || { message: 'Template not found' } };
    }

    const habitPayload = {
      user_id: userId,
      name: tpl.name,
      description: tpl.description,
      color: tpl.color || '#4ECDC4',
      frequency: { type: 'daily', every: 1 },
      start_date: new Date().toISOString().split('T')[0],
      template_id: tpl.id
    };

    // Enforce habit creation limits (same as habits.create)
    const { data: canCreate, error: checkError } = await supabase.rpc('can_create_habit', { 
      p_user_id: userId 
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
      .insert(habitPayload)
      .select()
      .single();

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
    
    // Convert file URI to a binary buffer suitable for upload in React Native
    const response = await fetch(fileUri);
    let body = null;
    try {
      if (response.blob) {
        body = await response.blob();
      } else if (response.arrayBuffer) {
        const buffer = await response.arrayBuffer();
        // Convert ArrayBuffer to Uint8Array for upload
        body = new Uint8Array(buffer);
      } else {
        // Last resort: read as text (base64 unlikely to work), pass response as-is
        body = await response.text();
      }
    } catch (err) {
      // Fallback for environments where blob() isn't available
      const buffer = await response.arrayBuffer();
      body = new Uint8Array(buffer);
    }

    const filePath = `profiles/${userId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('profile-images')
      .upload(filePath, body, {
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

// ============================================================================
// SOCIAL FEATURES (Premium)
// ============================================================================

export const socialFeatures = {
  // Friend connections
  sendFriendRequest: async (userId, friendEmail) => {
    if (!supabase) throw new Error('Supabase not configured');
    
    // First, find the friend by email
    const { data: friend, error: friendError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', friendEmail)
      .single();
    
    if (friendError || !friend) {
      return { data: null, error: { message: 'User not found' } };
    }
    
    const { data, error } = await supabase
      .from('friend_connections')
      .insert({
        user_id: userId,
        friend_id: friend.id,
        status: 'pending'
      })
      .select()
      .single();
    
    return { data, error };
  },

  acceptFriendRequest: async (connectionId) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('friend_connections')
      .update({ status: 'accepted' })
      .eq('id', connectionId)
      .select()
      .single();
    return { data, error };
  },

  getFriends: async (userId) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('friend_connections')
      .select(`
        id,
        status,
        created_at,
        friend:friend_id (id, username, email)
      `)
      .eq('user_id', userId)
      .eq('status', 'accepted');
    return { data, error };
  },

  getPendingRequests: async (userId) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('friend_connections')
      .select(`
        id,
        created_at,
        requester:user_id (id, username, email)
      `)
      .eq('friend_id', userId)
      .eq('status', 'pending');
    return { data, error };
  },

  removeFriend: async (connectionId) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase
      .from('friend_connections')
      .delete()
      .eq('id', connectionId);
    return { error };
  },

  // Leaderboard
  getLeaderboard: async (userId, period = 'weekly') => {
    if (!supabase) throw new Error('Supabase not configured');
    try {
      const { data, error } = await supabase.rpc('get_friends_leaderboard', {
        p_user_id: userId,
        p_period: period
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

  // Habit sharing
  shareHabit: async (habitId, ownerId, sharedWithId, permissions = {}) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('habit_shares')
      .insert({
        habit_id: habitId,
        owner_id: ownerId,
        shared_with_id: sharedWithId,
        can_view: permissions.canView ?? true,
        can_comment: permissions.canComment ?? false
      })
      .select()
      .single();
    return { data, error };
  },

  getSharedHabits: async (userId) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('habit_shares')
      .select(`
        id,
        can_view,
        can_comment,
        habit:habit_id (id, name, description, icon, color),
        owner:owner_id (username)
      `)
      .eq('shared_with_id', userId);
    return { data, error };
  },
};

// ============================================================================
// CHALLENGES (Premium)
// ============================================================================

export const challenges = {
  getTemplates: async (isPremium = false) => {
    if (!supabase) throw new Error('Supabase not configured');
    let query = supabase
      .from('challenge_templates')
      .select('*')
      .order('difficulty');
    
    if (!isPremium) {
      query = query.eq('is_premium', false);
    }
    
    const { data, error } = await query;
    return { data, error };
  },

  getUserChallenges: async (userId) => {
    if (!supabase) throw new Error('Supabase not configured');
    try {
      const { data, error } = await supabase.rpc('get_user_active_challenges', {
        p_user_id: userId
      });
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  createChallenge: async (challenge) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('user_challenges')
      .insert(challenge)
      .select()
      .single();
    return { data, error };
  },

  // Create a habit from a challenge template and start a user challenge linked to that habit.
  // Rolls back the habit if creating the user_challenges row fails.
  startChallengeFromTemplate: async (userId, templateId, opts = {}) => {
    if (!supabase) throw new Error('Supabase not configured');

    // Fetch template
    const { data: tpl, error: tplErr } = await supabase
      .from('challenge_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (tplErr || !tpl) {
      return { data: null, error: tplErr || { message: 'Template not found' } };
    }

    const startDate = opts.start_date || new Date().toISOString().split('T')[0];
    const duration = tpl.duration_days || (tpl.required_completions || 30);
    const end = new Date(startDate);
    end.setDate(end.getDate() + duration - 1);
    const endDate = end.toISOString().split('T')[0];

    // Create habit from template
    const habitPayload = {
      user_id: userId,
      name: tpl.name,
      description: tpl.description,
      color: tpl.color || '#4ECDC4',
      frequency: { type: 'daily', every: 1 },
      start_date: startDate,
      template_id: tpl.id
    };

    const { data: habit, error: habitErr } = await supabase
      .from('habits')
      .insert(habitPayload)
      .select()
      .single();

    if (habitErr || !habit) {
      return { data: null, error: habitErr || { message: 'Failed to create habit from template' } };
    }

    // Create user_challenges row linked to habit
    const ucPayload = {
      user_id: userId,
      challenge_template_id: tpl.id,
      habit_id: habit.id,
      name: tpl.name,
      description: tpl.description,
      start_date: startDate,
      end_date: endDate,
      target_completions: tpl.required_completions || duration,
      reward_points: tpl.reward_points || 0
    };

    const { data: uc, error: ucErr } = await supabase
      .from('user_challenges')
      .insert(ucPayload)
      .select()
      .single();

    if (ucErr || !uc) {
      // Attempt to rollback created habit to avoid dangling habits
      try {
        await supabase.from('habits').delete().eq('id', habit.id);
      } catch (e) {
        // ignore cleanup errors
      }
      return { data: null, error: ucErr || { message: 'Failed to create user challenge' } };
    }

    return { data: { habit, challenge: uc }, error: null };
  },

  updateChallengeProgress: async (challengeId, userId) => {
    if (!supabase) throw new Error('Supabase not configured');
    try {
      const { error } = await supabase.rpc('update_challenge_progress', {
        p_challenge_id: challengeId,
        p_user_id: userId
      });
      return { error };
    } catch (error) {
      return { error };
    }
  },

  abandonChallenge: async (challengeId) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('user_challenges')
      .update({ status: 'abandoned' })
      .eq('id', challengeId)
      .select()
      .single();
    return { data, error };
  },
};

// ============================================================================
// ACHIEVEMENTS & GAMIFICATION (Premium)
// ============================================================================

export const gamification = {
  getUserStats: async (userId) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('user_gamification')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    // Create if doesn't exist
    if (error && error.code === 'PGRST116') {
      const { data: newData, error: createError } = await supabase
        .from('user_gamification')
        .insert({ user_id: userId })
        .select()
        .single();
      return { data: newData, error: createError };
    }
    
    return { data, error };
  },

  getAchievements: async (userId) => {
    if (!supabase) throw new Error('Supabase not configured');
    try {
      const { data, error } = await supabase.rpc('get_user_achievements_progress', {
        p_user_id: userId
      });
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Fetch achievement definitions (including optional target_template_id)
  getDefinitions: async () => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .order('points', { ascending: false });
    return { data, error };
  },

  unlockAchievement: async (userId, achievementId) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievementId
      })
      .select()
      .single();
    
    if (!error) {
      // Update user gamification stats
      await supabase
        .from('user_gamification')
        .update({ 
          achievements_unlocked: supabase.raw('achievements_unlocked + 1')
        })
        .eq('user_id', userId);
    }
    
    return { data, error };
  },

  addPoints: async (userId, points, reason = '') => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('user_gamification')
      .update({ 
        total_points: supabase.raw(`total_points + ${points}`)
      })
      .eq('user_id', userId)
      .select()
      .single();
    return { data, error };
  },
};

// ============================================================================
// AI COACHING & INSIGHTS (Premium)
// ============================================================================

export const aiCoaching = {
  getInsights: async (userId, limit = 10) => {
    if (!supabase) throw new Error('Supabase not configured');
    try {
      const { data, error } = await supabase.rpc('get_user_ai_insights', {
        p_user_id: userId,
        p_limit: limit
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

  generateInsight: async (userId, habitId = null) => {
    if (!supabase) throw new Error('Supabase not configured');
    try {
      const { data, error } = await supabase.rpc('generate_ai_insight', {
        p_user_id: userId,
        p_habit_id: habitId
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

  markInsightAsRead: async (insightId) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('ai_insights')
      .update({ is_read: true })
      .eq('id', insightId)
      .select()
      .single();
    return { data, error };
  },

  getCoachingGoals: async (userId) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('coaching_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('deadline', { ascending: true });
    return { data, error };
  },

  createCoachingGoal: async (goal) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('coaching_goals')
      .insert(goal)
      .select()
      .single();
    return { data, error };
  },

  updateGoalProgress: async (goalId, currentValue) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('coaching_goals')
      .update({ current_value: currentValue })
      .eq('id', goalId)
      .select()
      .single();
    
    // Check if goal is completed
    if (data && data.current_value >= data.target_value) {
      await supabase
        .from('coaching_goals')
        .update({ status: 'completed' })
        .eq('id', goalId);
    }
    
    return { data, error };
  },
};

// ============================================================================
// INTEGRATIONS (Premium)
// ============================================================================

export const integrations = {
  getAll: async (userId) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('integrations')
      .select('id, service_name, is_active, settings, created_at')
      .eq('user_id', userId);
    return { data, error };
  },

  connect: async (userId, serviceName, tokens, settings = {}) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('integrations')
      .upsert({
        user_id: userId,
        service_name: serviceName,
        is_active: true,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_expires_at: tokens.expiresAt,
        settings: settings
      })
      .select()
      .single();
    return { data, error };
  },

  disconnect: async (integrationId) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('id', integrationId);
    return { error };
  },

  updateSettings: async (integrationId, settings) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('integrations')
      .update({ settings })
      .eq('id', integrationId)
      .select()
      .single();
    return { data, error };
  },
};

// ============================================================================
// SMART REMINDERS (Premium)
// ============================================================================

export const smartReminders = {
  getForHabit: async (userId, habitId) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('smart_reminders')
      .select('*')
      .eq('user_id', userId)
      .eq('habit_id', habitId)
      .single();
    return { data, error };
  },

  create: async (reminder) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('smart_reminders')
      .insert(reminder)
      .select()
      .single();
    return { data, error };
  },

  update: async (reminderId, updates) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('smart_reminders')
      .update(updates)
      .eq('id', reminderId)
      .select()
      .single();
    return { data, error };
  },

  recordSuccess: async (reminderId) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.rpc('increment', {
      table_name: 'smart_reminders',
      row_id: reminderId,
      column_name: 'times_completed_after'
    });
    return { data, error };
  },
};

// ============================================================================
// HABIT DEPENDENCIES (Premium)
// ============================================================================

export const habitDependencies = {
  create: async (userId, habitId, dependsOnHabitId, type = 'before') => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('habit_dependencies')
      .insert({
        user_id: userId,
        habit_id: habitId,
        depends_on_habit_id: dependsOnHabitId,
        dependency_type: type
      })
      .select()
      .single();
    return { data, error };
  },

  getForHabit: async (habitId) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('habit_dependencies')
      .select(`
        *,
        depends_on:depends_on_habit_id (id, name, icon, color)
      `)
      .eq('habit_id', habitId);
    return { data, error };
  },

  delete: async (dependencyId) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase
      .from('habit_dependencies')
      .delete()
      .eq('id', dependencyId);
    return { error };
  },
};

export default supabase;
