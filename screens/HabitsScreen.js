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
import HabitCard from '../components/HabitCard';
import * as Haptics from 'expo-haptics';
import { useTheme, spacing, borderRadius, fontSize, fontWeight, getShadowStyle } from '../constants/Theme';
import { scheduleHabitNotification, cancelHabitNotifications, formatTime, DAYS_OF_WEEK } from '../utils/notifications';
import { auth, habits as habitsService, habitCompletions } from '../services/supabaseService';

export default function HabitsScreen() {
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

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [fabScale] = useState(new Animated.Value(1));

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

  const initializeUser = async () => {
    try {
      const { data: { user } } = await auth.getCurrentUser();
      if (user) {
        setUserId(user.id);
        await loadHabits(user.id);
        await loadCompletions(user.id);
      }
    } catch (error) {
      console.error('Error initializing user:', error);
    } finally {
      setLoading(false);
    }
  };

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
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update completion');
    }
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
        <HabitCard
          habit={item}
          onToggleCompletion={toggleHabitCompletion}
          isCompleted={isHabitCompletedToday(item.id)}
        />
        <View style={styles.habitActions}>
          <TouchableOpacity
            style={[styles.notificationButton, notifications && styles.notificationActive]}
            onPress={() => openNotificationModal(item)}
          >
            <Ionicons 
              name={notifications ? "notifications" : "notifications-outline"} 
              size={20} 
              color={notifications ? "white" : "#007AFF"} 
            />
          </TouchableOpacity>
          
          {notifications && (
            <TouchableOpacity
              style={styles.removeNotificationButton}
              onPress={() => removeNotifications(item)}
            >
              <Ionicons name="close" size={16} color="#FF3B30" />
            </TouchableOpacity>
          )}
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
      </Animated.View>

      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }}
      >
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
  listContainer: {
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  habitContainer: {
    position: 'relative',
  },
  habitActions: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  notificationButton: {
    backgroundColor: theme.colors.card,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    ...getShadowStyle(theme, 'small'),
  },
  notificationActive: {
    backgroundColor: theme.colors.primary,
  },
  removeNotificationButton: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: borderRadius.md,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
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