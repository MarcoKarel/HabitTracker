// ========================================
// Supabase Service - Streak Tracking Functions
// Add these to your services/supabaseService.js file
// ========================================

// Streak tracking functions
export const streaks = {
  // Get dashboard statistics for home screen
  getDashboardStats: async (userId) => {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase
      .from('user_dashboard_stats')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    return { data, error };
  },

  // Get all habits with streak information
  getHabitsWithStreaks: async (userId) => {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase
      .rpc('get_habits_with_streaks', { p_user: userId });
    
    return { data, error };
  },

  // Get top N streaks for the user
  getTopStreaks: async (userId, limit = 3) => {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase
      .rpc('get_top_streaks', { 
        p_user: userId,
        p_limit: limit 
      });
    
    return { data, error };
  },

  // Get current streak for a specific habit
  getCurrentStreak: async (userId, habitId) => {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase
      .rpc('get_current_streak', { 
        p_user: userId,
        p_habit: habitId 
      });
    
    return { data, error };
  },

  // Get longest streak for a specific habit
  getLongestStreak: async (userId, habitId) => {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase
      .rpc('get_longest_streak', { 
        p_user: userId,
        p_habit: habitId 
      });
    
    return { data, error };
  },
};

// ========================================
// Example: Update HomeScreen.js
// ========================================

/*
Replace the loadData function in HomeScreen.js with this:

const loadData = async (uid) => {
  try {
    // Get comprehensive dashboard stats
    const { data: stats, error: statsError } = await streaks.getDashboardStats(uid);
    if (statsError) {
      console.error('Error loading stats:', statsError);
    } else {
      // Update state with stats
      setTotalHabits(stats.total_habits);
      setCompletedToday(stats.completed_today);
      setBestStreak(stats.best_current_streak);
      setTodaysProgress(
        stats.total_habits > 0 
          ? Math.round((stats.completed_today / stats.total_habits) * 100)
          : 0
      );
    }
    
    // Get top streaks for the "Top Streaks" section
    const { data: topStreaksData, error: streaksError } = await streaks.getTopStreaks(uid, 3);
    if (streaksError) {
      console.error('Error loading top streaks:', streaksError);
    } else {
      setTopStreaks(topStreaksData);
    }
    
  } catch (error) {
    console.error('Error loading data:', error);
  }
};

// Add these state variables:
const [totalHabits, setTotalHabits] = useState(0);
const [completedToday, setCompletedToday] = useState(0);
const [bestStreak, setBestStreak] = useState(0);
const [topStreaksData, setTopStreaks] = useState([]);

// Update the stat cards render:
{renderQuickStat('Total Habits', totalHabits, 'list', '#007AFF', 0)}
{renderQuickStat('Completed Today', completedToday, 'checkmark-circle', '#34C759', 1)}
{renderQuickStat('Best Streak', `${bestStreak} days`, 'flame', '#FF9500', 2)}

// Update the Top Streaks section:
{topStreaksData.map((streak, index) => (
  <View key={streak.habit_id} style={styles.streakItem}>
    <Text style={styles.streakHabit}>{streak.habit_name}</Text>
    <Text style={styles.streakDays}>{streak.current_streak} days</Text>
  </View>
))}
*/

// ========================================
// Example: Update HabitsScreen.js
// ========================================

/*
Replace the loadHabits function with this to include streak data:

const loadHabits = async (uid) => {
  try {
    const { data, error } = await streaks.getHabitsWithStreaks(uid);
    if (error) {
      console.error('Error loading habits:', error);
      return;
    }
    
    // Map the data to include streak information
    const habitsWithStreaks = data.map(habit => ({
      id: habit.habit_id,
      name: habit.habit_name,
      description: habit.description,
      color: habit.color,
      currentStreak: habit.current_streak,
      longestStreak: habit.longest_streak,
      completedToday: habit.completed_today,
      lastCompletedDate: habit.last_completed_date,
      totalCompletions: habit.total_completions
    }));
    
    setHabits(habitsWithStreaks);
  } catch (error) {
    console.error('Error loading habits:', error);
  }
};

// Then in your HabitCard component, you can display:
<Text>Current Streak: {habit.currentStreak} days 🔥</Text>
<Text>Best Streak: {habit.longestStreak} days</Text>
<Text>Total: {habit.totalCompletions} completions</Text>
*/

// ========================================
// Example: Create a StreakBadge Component
// ========================================

/*
Create components/StreakBadge.js:

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function StreakBadge({ streak, size = 'medium' }) {
  const getStreakColor = () => {
    if (streak >= 30) return '#FF3B30'; // Red for 30+ days
    if (streak >= 14) return '#FF9500'; // Orange for 14+ days
    if (streak >= 7) return '#FFCC00';  // Yellow for 7+ days
    if (streak >= 3) return '#34C759';  // Green for 3+ days
    return '#8E8E93'; // Gray for less than 3
  };

  const getSize = () => {
    switch(size) {
      case 'small': return { icon: 16, text: 12 };
      case 'large': return { icon: 32, text: 20 };
      default: return { icon: 24, text: 16 };
    }
  };

  const sizes = getSize();
  const color = getStreakColor();

  if (streak === 0) return null;

  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Ionicons name="flame" size={sizes.icon} color={color} />
      <Text style={[styles.streakText, { fontSize: sizes.text, color }]}>
        {streak}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  streakText: {
    fontWeight: 'bold',
    marginLeft: 4,
  },
});

// Usage in HabitCard:
<StreakBadge streak={habit.currentStreak} />
*/

// ========================================
// Example: Add to StatisticsScreen
// ========================================

/*
In StatisticsScreen.js, add a streak history section:

const loadStreakData = async (uid) => {
  try {
    const { data, error } = await streaks.getHabitsWithStreaks(uid);
    if (error) {
      console.error('Error loading streak data:', error);
      return;
    }
    
    // Find habits with best streaks
    const sortedByCurrentStreak = [...data].sort((a, b) => 
      b.current_streak - a.current_streak
    );
    
    const sortedByLongestStreak = [...data].sort((a, b) => 
      b.longest_streak - a.longest_streak
    );
    
    setCurrentStreakLeaders(sortedByCurrentStreak.slice(0, 5));
    setAllTimeStreakLeaders(sortedByLongestStreak.slice(0, 5));
    
  } catch (error) {
    console.error('Error loading streak data:', error);
  }
};

// Add state:
const [currentStreakLeaders, setCurrentStreakLeaders] = useState([]);
const [allTimeStreakLeaders, setAllTimeStreakLeaders] = useState([]);

// Render:
<View style={styles.section}>
  <Text style={styles.sectionTitle}>🔥 Current Streak Leaders</Text>
  {currentStreakLeaders.map((habit, index) => (
    <View key={habit.habit_id} style={styles.leaderItem}>
      <Text style={styles.rank}>{index + 1}</Text>
      <Text style={styles.habitName}>{habit.habit_name}</Text>
      <Text style={styles.streakValue}>{habit.current_streak} days</Text>
    </View>
  ))}
</View>

<View style={styles.section}>
  <Text style={styles.sectionTitle}>🏆 All-Time Best Streaks</Text>
  {allTimeStreakLeaders.map((habit, index) => (
    <View key={habit.habit_id} style={styles.leaderItem}>
      <Text style={styles.rank}>{index + 1}</Text>
      <Text style={styles.habitName}>{habit.habit_name}</Text>
      <Text style={styles.streakValue}>{habit.longest_streak} days</Text>
    </View>
  ))}
</View>
*/

// ========================================
// Real-time Streak Updates
// ========================================

/*
If you want streaks to update in real-time when completions change:

import { useEffect } from 'react';

useEffect(() => {
  if (!userId) return;

  // Subscribe to completion changes
  const subscription = supabase
    .channel('completion_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'completions',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log('Completion changed:', payload);
        // Reload streak data
        loadData(userId);
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, [userId]);
*/

// ========================================
// Export all streak functions
// ========================================

export default {
  streaks,
};
