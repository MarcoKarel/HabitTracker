import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Animated, 
  Easing 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import HabitHeatmap from '../components/HabitHeatmap';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useTheme, spacing, borderRadius, fontSize, fontWeight, getShadowStyle } from '../constants/Theme';

export default function StatisticsScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [habits, setHabits] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [selectedHabit, setSelectedHabit] = useState(null);

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [cardAnimations] = useState([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0)
  ]);

  useEffect(() => {
    loadData();
    
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }),
      // Staggered card animations
      Animated.stagger(150, cardAnimations.map(anim => 
        Animated.timing(anim, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      ))
    ]).start();
  }, []);

  const loadData = async () => {
    try {
      const storedHabits = await AsyncStorage.getItem('habits');
      const storedCompletions = await AsyncStorage.getItem('completions');
      
      if (storedHabits) {
        const habitsData = JSON.parse(storedHabits);
        setHabits(habitsData);
        if (habitsData.length > 0) {
          setSelectedHabit(habitsData[0]);
        }
      }
      
      if (storedCompletions) {
        setCompletions(JSON.parse(storedCompletions));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const getStreakCount = (habitId) => {
    const habitCompletions = completions
      .filter(c => c.habitId === habitId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < habitCompletions.length; i++) {
      const completionDate = new Date(habitCompletions[i].date);
      const daysDiff = Math.floor((today - completionDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const getTotalCompletions = (habitId) => {
    return completions.filter(c => c.habitId === habitId).length;
  };

  const getThisWeekCompletions = (habitId) => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    
    return completions.filter(c => {
      if (c.habitId !== habitId) return false;
      const completionDate = new Date(c.date);
      return completionDate >= weekStart && completionDate <= today;
    }).length;
  };

  const getThisMonthCompletions = (habitId) => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    return completions.filter(c => {
      if (c.habitId !== habitId) return false;
      const completionDate = new Date(c.date);
      return completionDate >= monthStart && completionDate <= today;
    }).length;
  };

  const renderStatCard = (title, value, icon, color = '#007AFF') => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );

  const renderAnimatedStatCard = (title, value, icon, color = '#007AFF', index) => (
    <Animated.View 
      style={[
        styles.statCard, 
        { 
          borderLeftColor: color,
          opacity: cardAnimations[index],
          transform: [
            { 
              translateY: cardAnimations[index].interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              })
            },
            {
              scale: cardAnimations[index].interpolate({
                inputRange: [0, 1],
                outputRange: [0.95, 1],
              })
            }
          ]
        }
      ]}
    >
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </Animated.View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <Text style={styles.title}>Statistics</Text>
      </Animated.View>

      {habits.length > 0 && (
        <>
          <Animated.View 
            style={[
              styles.habitSelector,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Text style={styles.selectorLabel}>Select Habit:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedHabit?.id}
                onValueChange={(itemValue) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const habit = habits.find(h => h.id === itemValue);
                  setSelectedHabit(habit);
                }}
                style={styles.picker}
              >
                {habits.map(habit => (
                  <Picker.Item
                    key={habit.id}
                    label={habit.name}
                    value={habit.id}
                  />
                ))}
              </Picker>
            </View>
          </Animated.View>

          {selectedHabit && (
            <>
              <Animated.View 
                style={[
                  styles.statsGrid,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                  }
                ]}
              >
                {renderAnimatedStatCard(
                  'Current Streak',
                  `${getStreakCount(selectedHabit.id)} days`,
                  'flame',
                  '#FF6B35',
                  0
                )}
                {renderAnimatedStatCard(
                  'Total Completions',
                  getTotalCompletions(selectedHabit.id),
                  'checkmark-circle',
                  '#34C759',
                  1
                )}
                {renderAnimatedStatCard(
                  'This Week',
                  `${getThisWeekCompletions(selectedHabit.id)}/7`,
                  'calendar',
                  '#007AFF',
                  2
                )}
                {renderAnimatedStatCard(
                  'This Month',
                  getThisMonthCompletions(selectedHabit.id),
                  'calendar-outline',
                  '#AF52DE',
                  3
                )}
              </Animated.View>

              <Animated.View
                style={{
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }}
              >
                <HabitHeatmap
                  completionData={completions}
                  selectedHabit={selectedHabit}
                />
              </Animated.View>
            </>
          )}
        </>
      )}

      {habits.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="bar-chart-outline" size={64} color="#ccc" />
          <Text style={styles.emptyStateText}>No habits to analyze yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Add some habits and start tracking to see your statistics!
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
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
  habitSelector: {
    backgroundColor: theme.colors.card,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    ...getShadowStyle(theme, 'default'),
  },
  selectorLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
    color: theme.colors.text,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: borderRadius.sm,
  },
  picker: {
    height: 50,
    color: theme.colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    backgroundColor: theme.colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flex: 1,
    minWidth: '45%',
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    ...getShadowStyle(theme, 'default'),
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statTitle: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: spacing.sm,
    fontWeight: fontWeight.medium,
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    marginTop: spacing.xxl,
  },
  emptyStateText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: fontSize.sm,
    color: theme.colors.textTertiary,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});