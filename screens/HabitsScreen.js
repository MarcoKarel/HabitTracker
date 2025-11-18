import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  Modal, 
  Alert, 
  Animated, 
  Easing,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HabitCard from '../components/HabitCard';
import * as Haptics from 'expo-haptics';
import { useTheme, spacing, borderRadius, fontSize, fontWeight, getShadowStyle } from '../constants/Theme';
import { scheduleHabitNotification, cancelHabitNotifications, formatTime, DAYS_OF_WEEK } from '../utils/notifications';
import { auth, habits as habitsService, habitCompletions, challenges as challengesService, gamification as gamificationService } from '../services/supabaseService';
const CHALLENGE_TEMPLATES = require('../Documentation/challenge_templates.json');

const STORAGE_KEYS = {
  PROGRESS_MAP: 'challengeProgressMap',
  ACTIVE: 'activeChallengeName',
}

export default function HabitsScreen({ navigation }) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [habits, setHabits] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitDescription, setNewHabitDescription] = useState('');
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]); // Weekdays by default
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [activeProgress, setActiveProgress] = useState(0);
  const [activeHabitId, setActiveHabitId] = useState(null);

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [fabScale] = useState(new Animated.Value(1));

  // Today's date string for comparisons
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    initializeUser();
    
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  useEffect(() => {
    if (!navigation) return;
    const unsub = navigation.addListener('focus', async () => {
      try {
        // Ensure we refresh habits/completions when returning to this screen
        const session = await auth.getCurrentUser();
        const user = session?.data?.user;
        if (user && user.id) {
          setUserId(user.id);
          await loadHabits(user.id);
          await loadCompletions(user.id);
        }
      } catch (e) {
        console.warn('Error refreshing habits on focus', e);
      }

      // Always refresh active challenge info from storage
      await loadActiveFromStorage();
    });

    return unsub;
  }, [navigation]);

  const initializeUser = async () => {
    try {
      const { data: { user } } = await auth.getCurrentUser();
      if (user) {
        setUserId(user.id);
        await loadHabits(user.id);
        await loadCompletions(user.id);
        await loadActiveFromStorage();
      }
    } catch (error) {
      console.error('Error initializing user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveFromStorage = async () => {
    try {
      const activeName = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE);
      const rawMap = await AsyncStorage.getItem(STORAGE_KEYS.PROGRESS_MAP);
      const rawHabitMap = await AsyncStorage.getItem('challengeHabitMap');
      const habitMap = rawHabitMap ? JSON.parse(rawHabitMap) : {};
      const map = rawMap ? JSON.parse(rawMap) : {};
      if (activeName) {
        const template = CHALLENGE_TEMPLATES.find(t => t.name === activeName);
        const entry = map[activeName] || { completions: 0 };
        // If template not found in local JSON, try to resolve it from achievements definitions
        if (!template) {
          try {
            const habitId = habitMap[activeName] || null;
            let resolved = null;
            // If we have a habitId, try to find the habit and its template_id
            const habitObj = habitId ? habits.find(h => h.id === habitId) : null;

            // Fetch definitions (achievement rows treated as templates)
            const { data: defs } = await gamificationService.getDefinitions();
            const { data: userAch } = userId ? await gamificationService.getAchievements(userId) : { data: null };

            if (Array.isArray(defs)) {
              // First try matching by habit.template_id (if habit exists)
              if (habitObj && habitObj.template_id) {
                resolved = defs.find(d => d.id === habitObj.template_id);
              }
              // Fall back to matching by name
              if (!resolved) resolved = defs.find(d => d.name === activeName);
            }

            const requirement = resolved?.requirement_value || resolved?.required_completions || resolved?.duration_days || resolved?.duration || null;
            const serverProgress = Array.isArray(userAch) ? userAch.find(a => a.achievement_id === resolved?.id || a.name === resolved?.name) : null;
            const progress = serverProgress?.progress ?? entry.completions ?? 0;

            setActiveChallenge(resolved ? { ...resolved, required_completions: requirement } : { name: activeName });
            setActiveProgress(progress || 0);
            setActiveHabitId(habitId);
            return;
          } catch (e) {
            console.warn('Failed to resolve active challenge from achievements', e);
            setActiveChallenge({ name: activeName });
            setActiveProgress(entry.completions || 0);
            setActiveHabitId(habitMap[activeName] || null);
            return;
          }
        }

        setActiveChallenge(template || { name: activeName });
        setActiveProgress(entry.completions || 0);
        setActiveHabitId(habitMap[activeName] || null);
      } else {
        setActiveChallenge(null);
        setActiveProgress(0);
        setActiveHabitId(null);
      }
    } catch (e) {
      console.warn('Error loading active challenge from storage', e);
    }
  }

  const markActiveChallengeDone = async () => {
    if (!activeChallenge) return;
    const today = new Date().toISOString().split('T')[0];

    // If we have a habit id for this challenge, prefer creating a real completion row
    if (activeHabitId) {
      const already = isHabitCompletedToday(activeHabitId);
      if (already) {
        Alert.alert('Already done', 'You already marked this habit completed today.');
        return;
      }

      await toggleHabitCompletion(activeHabitId);
    }

    // Update local AsyncStorage progress map (works for both logged-out and logged-in flows)
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.PROGRESS_MAP);
      const map = raw ? JSON.parse(raw) : {};
      const name = activeChallenge.name;
      const entry = map[name] || { completions: 0, lastCompletionDate: null };
      if (entry.lastCompletionDate === today) {
        Alert.alert('Already done', 'You have already marked this challenge done today.');
        return;
      }
      entry.completions = (entry.completions || 0) + 1;
      entry.lastCompletionDate = today;
      map[name] = entry;
      await AsyncStorage.setItem(STORAGE_KEYS.PROGRESS_MAP, JSON.stringify(map));
      setActiveProgress(entry.completions);

      if (entry.completions >= (activeChallenge.required_completions || Infinity)) {
        Alert.alert('Achievement unlocked!', `${name} completed!`);
      }
    } catch (e) {
      console.warn('Error updating challenge progress', e);
    }
  }

  const loadHabits = async (uid) => {
    try {
      const { data, error } = await habitsService.getAll(uid);
      if (error) {
        console.error('Error loading habits:', error);
        return;
      }
      setHabits(data || []);
    } catch (error) {
      console.error('Error loading habits:', error);
    }
  };

  const loadCompletions = async (uid) => {
    try {
      const { data, error } = await habitCompletions.getAll(uid);
      if (error) {
        console.error('Error loading completions:', error);
        return;
      }
      setCompletions(data || []);
    } catch (error) {
      console.error('Error loading completions:', error);
    }
  };

  // Overall progress for today: number of completions for today's date vs total habits
  const completedTodayCount = completions.filter(c => c.date === todayStr && habits.some(h => h.id === c.habit_id)).length;
  const totalHabitsCount = habits.length;
  const overallProgressPercent = totalHabitsCount > 0 ? (completedTodayCount / totalHabitsCount) : 0;

  const addHabit = async () => {
    if (newHabitName.trim() && userId) {
      try {
        const newHabit = {
          user_id: userId,
          name: newHabitName.trim(),
          description: newHabitDescription.trim(),
          color: '#007AFF',
          frequency: { type: 'daily' },
          target: 1,
        };
        
        const { data, error } = await habitsService.create(newHabit);
        if (error) {
          if (error.isPremiumFeature) {
            showPremiumUpgrade(navigation, {
              title: '🌟 Premium Feature',
              message: 'Creating more habits requires a Premium subscription. Upgrade to add more habits.'
            });
            return;
          }
          Alert.alert('Error', 'Failed to create habit');
          return;
        }
        
        setHabits([...habits, data]);
        setNewHabitName('');
        setNewHabitDescription('');
        setModalVisible(false);
      } catch (error) {
        Alert.alert('Error', 'Failed to create habit');
      }
    } else {
      Alert.alert('Error', 'Please enter a habit name');
    }
  };

  const toggleHabitCompletion = async (habitId) => {
    const today = new Date().toISOString().split('T')[0];
    const existingCompletion = completions.find(
      c => c.habit_id === habitId && c.date === today
    );

    try {
      if (existingCompletion) {
        // Remove completion
        const { error } = await habitCompletions.delete(existingCompletion.id);
        if (error) {
          Alert.alert('Error', 'Failed to remove completion');
          return;
        }
        setCompletions(completions.filter(c => c.id !== existingCompletion.id));
        // If this completion belonged to the active challenge habit, update active progress
        if (habitId === activeHabitId && activeChallenge) {
          try {
            const raw = await AsyncStorage.getItem(STORAGE_KEYS.PROGRESS_MAP);
            const map = raw ? JSON.parse(raw) : {};
            const name = activeChallenge.name;
            const entry = map[name] || { completions: 0, lastCompletionDate: null };
            // Only decrement if lastCompletionDate was today
            if (entry.lastCompletionDate === today) {
              entry.completions = Math.max(0, (entry.completions || 0) - 1);
              entry.lastCompletionDate = null;
              map[name] = entry;
              await AsyncStorage.setItem(STORAGE_KEYS.PROGRESS_MAP, JSON.stringify(map));
              setActiveProgress(entry.completions || 0);
            }
          } catch (e) {
            console.warn('Failed to update active progress on deletion', e);
          }
        }
        // Deletion of a completion will be handled by server-side logic if needed.
        // Avoid calling `update_challenge_progress` here because that RPC increments progress.
      } else {
        // Add completion
        const newCompletion = {
          user_id: userId,
          habit_id: habitId,
          date: today,
        };
        const { data, error } = await habitCompletions.create(newCompletion);
        if (error) {
          Alert.alert('Error', 'Failed to add completion');
          return;
        }
        setCompletions([...completions, data]);
        // If this completion is for the active challenge habit, update active progress
        if (habitId === activeHabitId && activeChallenge) {
          try {
            const raw = await AsyncStorage.getItem(STORAGE_KEYS.PROGRESS_MAP);
            const map = raw ? JSON.parse(raw) : {};
            const name = activeChallenge.name;
            const entry = map[name] || { completions: 0, lastCompletionDate: null };
            if (entry.lastCompletionDate !== today) {
              entry.completions = (entry.completions || 0) + 1;
              entry.lastCompletionDate = today;
              map[name] = entry;
              await AsyncStorage.setItem(STORAGE_KEYS.PROGRESS_MAP, JSON.stringify(map));
              setActiveProgress(entry.completions || 0);

              if (entry.completions >= (activeChallenge.required_completions || Infinity)) {
                Alert.alert('Achievement unlocked!', `${name} completed!`);
              }
            }
          } catch (e) {
            console.warn('Failed to update active progress on completion', e);
          }
            // Ask server to update related user_challenge progress so achievements update
            try {
              // Prefer using locally stored mappings (populated when a challenge is started)
              const habitObj = habits.find(h => h.id === habitId);
              if (habitObj && userId) {
                const rawHabitMap = await AsyncStorage.getItem('challengeHabitMap');
                const habitMap = rawHabitMap ? JSON.parse(rawHabitMap) : {};
                const rawUserMap = await AsyncStorage.getItem('challengeUserMap');
                const userMap = rawUserMap ? JSON.parse(rawUserMap) : {};

                // Find the activeName key that maps to this habit id
                const matchedKey = Object.keys(habitMap).find(k => habitMap[k] === habitId);
                const matchedId = matchedKey ? userMap[matchedKey] : null;
                if (matchedId) {
                  const { error: updErr } = await challengesService.updateChallengeProgress(matchedId, userId);
                  if (updErr) console.warn('updateChallengeProgress error', updErr);
                }
              }
            } catch (e) {
              console.warn('Failed to update server challenge progress on completion', e);
            }
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update completion');
    }
  };

  const deleteHabit = async (habit) => {
    Alert.alert(
      'Delete Habit',
      `Are you sure you want to delete "${habit.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await habitsService.delete(habit.id);
              if (error) {
                Alert.alert('Error', 'Failed to delete habit');
                return;
              }
              setHabits(habits.filter(h => h.id !== habit.id));
              setCompletions(completions.filter(c => c.habit_id !== habit.id));
              // If deleted habit was active challenge habit, clear active challenge
              if (habit.id === activeHabitId) {
                await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE);
                const rawMap = await AsyncStorage.getItem(STORAGE_KEYS.PROGRESS_MAP);
                const map = rawMap ? JSON.parse(rawMap) : {};
                delete map[activeChallenge?.name];
                await AsyncStorage.setItem(STORAGE_KEYS.PROGRESS_MAP, JSON.stringify(map));
                setActiveChallenge(null);
                setActiveProgress(0);
                setActiveHabitId(null);
              }
            } catch (e) {
              Alert.alert('Error', 'Failed to delete habit');
            }
          }
        }
      ]
    );
  };

  const isHabitCompletedToday = (habitId) => {
    const today = new Date().toISOString().split('T')[0];
    return completions.some(c => c.habit_id === habitId && c.date === today);
  };

  const toggleDaySelection = (dayId) => {
    setSelectedDays(prev => 
      prev.includes(dayId) 
        ? prev.filter(id => id !== dayId)
        : [...prev, dayId]
    );
  };

  const setupNotifications = async () => {
    if (!selectedHabit || selectedDays.length === 0) {
      Alert.alert('Error', 'Please select at least one day for reminders');
      return;
    }

    try {
      const time = {
        hour: reminderTime.getHours(),
        minute: reminderTime.getMinutes(),
      };

      await scheduleHabitNotification(
        selectedHabit.id,
        selectedHabit.name,
        time,
        selectedDays
      );

      // Update habit with notification settings in Supabase
      const settings = {
        notifications: {
          time,
          days: selectedDays,
          enabled: true
        }
      };

      const { error } = await habitsService.update(selectedHabit.id, { settings });
      if (error) {
        Alert.alert('Error', 'Failed to save notification settings');
        return;
      }

      // Update local state
      const updatedHabits = habits.map(habit => 
        habit.id === selectedHabit.id 
          ? { ...habit, settings }
          : habit
      );

      setHabits(updatedHabits);
      setNotificationModalVisible(false);
      Alert.alert('Success', `Reminders set for ${selectedHabit.name} at ${formatTime(time)}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to set up notifications');
    }
  };

  const removeNotifications = async (habit) => {
    try {
      await cancelHabitNotifications(habit.id);
      
      const { error } = await habitsService.update(habit.id, { settings: { notifications: null } });
      if (error) {
        Alert.alert('Error', 'Failed to remove notifications');
        return;
      }

      const updatedHabits = habits.map(h => 
        h.id === habit.id 
          ? { ...h, settings: { notifications: null } }
          : h
      );

      setHabits(updatedHabits);
      Alert.alert('Success', 'Reminders removed');
    } catch (error) {
      Alert.alert('Error', 'Failed to remove notifications');
    }
  };

  const openNotificationModal = (habit) => {
    setSelectedHabit(habit);
    const notifications = habit.settings?.notifications;
    if (notifications) {
      const notificationTime = new Date();
      notificationTime.setHours(notifications.time.hour);
      notificationTime.setMinutes(notifications.time.minute);
      setReminderTime(notificationTime);
      setSelectedDays(notifications.days);
    } else {
      const defaultTime = new Date();
      defaultTime.setHours(9, 0, 0, 0); // 9:00 AM
      setReminderTime(defaultTime);
      setSelectedDays([1, 2, 3, 4, 5]); // Weekdays
    }
    setNotificationModalVisible(true);
  };

  const renderHabit = ({ item }) => {
    const notifications = item.settings?.notifications;
    return (
      <View style={styles.habitContainer}>
        <View style={{ flex: 1 }}>
          <HabitCard
            habit={item}
            onToggleCompletion={toggleHabitCompletion}
            isCompleted={isHabitCompletedToday(item.id)}
          />
        </View>

        <View style={styles.habitActions}>
          <TouchableOpacity
            style={[styles.notificationButton, notifications && styles.notificationActive]}
            onPress={() => openNotificationModal(item)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel={`Set reminders for ${item.name}`}
            accessibilityRole="button"
          >
            <Ionicons
              name={notifications ? 'notifications' : 'notifications-outline'}
              size={22}
              color={notifications ? 'white' : theme.colors.primary}
            />
          </TouchableOpacity>

          {notifications && (
            <TouchableOpacity
              style={styles.removeNotificationButton}
              onPress={() => removeNotifications(item)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel={`Remove reminders for ${item.name}`}
              accessibilityRole="button"
            >
              <Ionicons name="close" size={16} color={theme.colors.error} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteHabit(item)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel={`Delete ${item.name}`}
            accessibilityRole="button"
          >
            <Ionicons name="trash" size={20} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <Text style={styles.title}>Today's Habits</Text>
        <Animated.View style={{ transform: [{ scale: fabScale }] }}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              
              // FAB animation
              Animated.sequence([
                Animated.timing(fabScale, {
                  toValue: 0.9,
                  duration: 100,
                  useNativeDriver: true,
                }),
                Animated.timing(fabScale, {
                  toValue: 1,
                  duration: 100,
                  useNativeDriver: true,
                })
              ]).start();
              
              setModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </Animated.View>
        <TouchableOpacity
          style={[styles.debugButtonHeader]}
          onPress={async () => {
            try {
              const uid = userId;
              if (!uid) {
                Alert.alert('Not signed in', 'Please sign in to debug');
                return;
              }

              const { data: completionsData, error: compErr } = await habitCompletions.getAll(uid);
              const { data: achievementsData, error: achErr } = await gamificationService.getAchievements(uid);

              console.debug('Debug Progress:', { completionsData, achievementsData, compErr, achErr });

              const compCount = Array.isArray(completionsData) ? completionsData.length : 0;
              const achCount = Array.isArray(achievementsData) ? achievementsData.length : 0;

              // Count and sample only achievements that target challenge templates
              const templateLinked = (achievementsData || []).filter(a => a.target_template_id);
              const tCount = templateLinked.length;
              const tSample = templateLinked.slice(0, 5).map(a => a.name || a.achievement_id).join(', ') || '—';

              const achSample = (achievementsData || []).slice(0, 5).map(a => `${a.name}(${a.progress||0}/${a.requirement_value||'—'})`).join('\n') || '—';

              let msg = `template-linked achievements: ${tCount}\ncompletions: ${compCount}\nachievements: ${achCount}\n\nTemplates: ${tSample}\n\nAchievements sample:\n${achSample}`;
              if (compErr || achErr) {
                msg += '\n\nErrors:';
                if (compErr) msg += `\ncompletions: ${compErr.message || JSON.stringify(compErr)}`;
                if (achErr) msg += `\nachievements: ${achErr.message || JSON.stringify(achErr)}`;
              }

              Alert.alert('Debug Progress', msg);
            } catch (e) {
              console.warn('Debug button error', e);
              Alert.alert('Debug Error', e.message || JSON.stringify(e));
            }
          }}
        >
          <Ionicons name="bug" size={20} color={theme.colors.surface} />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }}
      >
        {activeChallenge && (
          <View style={styles.activeBanner}>
            <Text style={styles.activeBannerTitle}>Active Challenge</Text>
            <Text style={styles.activeBannerName}>{activeChallenge.name}</Text>
            {activeChallenge.description ? (
              <Text style={styles.activeBannerDesc} numberOfLines={2}>{activeChallenge.description}</Text>
            ) : null}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.sm }}>
              <TouchableOpacity style={styles.activeDoneButton} onPress={markActiveChallengeDone} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel="Mark active challenge done today" accessibilityRole="button">
                <Text style={styles.activeDoneButtonText}>Done Today</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.activeProgressContainer}>
              <View style={styles.activeProgressBackground}>
                <View
                  style={[
                    styles.activeProgressFill,
                    { width: `${Math.min(1, (activeProgress || 0) / (activeChallenge.required_completions || 1)) * 100}%`, backgroundColor: activeChallenge.color || '#4CAF50' }
                  ]}
                />
              </View>
              <Text style={styles.activeProgressText}>{`${activeProgress || 0}/${activeChallenge.required_completions || '—'}`}</Text>
            </View>
          </View>
        )}
        <FlatList
          data={habits}
          renderItem={renderHabit}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>

      {/* Add Habit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Habit</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Habit name"
              value={newHabitName}
              onChangeText={setNewHabitName}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Description (optional)"
              value={newHabitDescription}
              onChangeText={setNewHabitDescription}
              multiline
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.addHabitButton]}
                onPress={addHabit}
              >
                <Text style={styles.addButtonText}>Add Habit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notification Setup Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={notificationModalVisible}
        onRequestClose={() => setNotificationModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Set Reminders for {selectedHabit?.name}
            </Text>
            
            <Text style={styles.sectionTitle}>Reminder Time</Text>
            <TouchableOpacity 
              style={styles.timeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={20} color="#007AFF" />
              <Text style={styles.timeText}>
                {formatTime({
                  hour: reminderTime.getHours(),
                  minute: reminderTime.getMinutes()
                })}
              </Text>
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker
                value={reminderTime}
                mode="time"
                is24Hour={false}
                onChange={(event, selectedDate) => {
                  setShowTimePicker(false);
                  if (selectedDate) {
                    setReminderTime(selectedDate);
                  }
                }}
              />
            )}
            
            <Text style={styles.sectionTitle}>Reminder Days</Text>
            <View style={styles.daysContainer}>
              {DAYS_OF_WEEK.map(day => (
                <TouchableOpacity
                  key={day.id}
                  style={[
                    styles.dayButton,
                    selectedDays.includes(day.id) && styles.dayButtonSelected
                  ]}
                  onPress={() => toggleDaySelection(day.id)}
                >
                  <Text style={[
                    styles.dayButtonText,
                    selectedDays.includes(day.id) && styles.dayButtonTextSelected
                  ]}>
                    {day.short}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setNotificationModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.addHabitButton]}
                onPress={setupNotifications}
              >
                <Text style={styles.addButtonText}>Set Reminders</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
    ...getShadowStyle(theme, 'small'),
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: theme.colors.text,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...getShadowStyle(theme, 'default'),
  },
  debugButtonHeader: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    backgroundColor: 'transparent'
  },
  listContainer: {
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  habitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  habitActions: {
    flexDirection: 'column',
    alignItems: 'center',
    marginLeft: spacing.md,
    zIndex: 10,
  },
  notificationButton: {
    backgroundColor: theme.colors.card,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: 22,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 0,
    marginVertical: spacing.xs,
    ...getShadowStyle(theme, 'small'),
  },
  notificationActive: {
    backgroundColor: theme.colors.primary,
  },
  removeNotificationButton: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: 18,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    width: '90%',
    maxWidth: 400,
    ...getShadowStyle(theme, 'large'),
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.lg,
    textAlign: 'center',
    color: theme.colors.text,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
    marginTop: spacing.md,
    color: theme.colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: fontSize.md,
    color: theme.colors.text,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
  },
  timeText: {
    fontSize: fontSize.md,
    marginLeft: spacing.sm,
    color: theme.colors.text,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayButton: {
    backgroundColor: theme.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  dayButtonSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dayButtonText: {
    fontSize: fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: fontWeight.semibold,
  },
  dayButtonTextSelected: {
    color: '#FFFFFF',
  },
  activeBanner: {
    backgroundColor: theme.colors.card,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    ...getShadowStyle(theme, 'small'),
  },
  activeBannerTitle: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  activeBannerName: {
    fontSize: fontSize.lg,
    color: theme.colors.text,
    fontWeight: fontWeight.bold,
  },
  activeBannerDesc: {
    color: theme.colors.text,
    marginTop: spacing.xs,
  },
  activeProgressContainer: { marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center' },
  activeProgressBackground: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  activeProgressFill: { height: '100%' },
  activeProgressText: { width: 56, textAlign: 'right', fontSize: fontSize.xs, color: theme.colors.textSecondary },

  overallProgressBox: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.card,
    ...getShadowStyle(theme, 'small'),
  },
  overallProgressTitle: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: fontWeight.semibold,
  },
  overallProgressBackground: {
    width: '100%',
    height: 10,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  overallProgressFill: { height: '100%' },
  overallProgressText: { fontSize: fontSize.xs, color: theme.colors.textSecondary },
  activeDoneButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  activeDoneButtonText: {
    color: '#fff',
    fontWeight: fontWeight.semibold,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
  },
  addHabitButton: {
    backgroundColor: theme.colors.primary,
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.md,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.md,
  },
});