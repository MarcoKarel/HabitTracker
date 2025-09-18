import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import type { HabitWithCompletions } from '@habit-tracker/shared';

const { width } = Dimensions.get('window');

interface HabitCardProps {
  habit: HabitWithCompletions;
  onToggle: (habitId: string) => void;
  onEdit: (habit: HabitWithCompletions) => void;
  index: number;
}

export function HabitCard({ habit, onToggle, onEdit, index }: HabitCardProps) {
  const [scaleAnim] = useState(new Animated.Value(1));

  const isCompletedToday = habit.completions.some(
    completion => {
      const today = new Date().toISOString().split('T')[0];
      return completion.completed_at.split('T')[0] === today;
    }
  );

  const currentStreak = habit.current_streak || 0;
  const completionRate = habit.completion_rate || 0;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onToggle(habit.id);
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity 
        style={[
          styles.card,
          isCompletedToday && styles.completedCard
        ]} 
        onPress={handlePress}
        onLongPress={() => onEdit(habit)}
        activeOpacity={0.8}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{habit.title}</Text>
          <View style={[
            styles.statusIndicator,
            isCompletedToday && styles.completedIndicator
          ]}>
            <Text style={styles.statusText}>
              {isCompletedToday ? '✓' : '○'}
            </Text>
          </View>
        </View>

        {habit.description && (
          <Text style={styles.description}>{habit.description}</Text>
        )}

        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{currentStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          
          <View style={styles.stat}>
            <Text style={styles.statValue}>{Math.round(completionRate)}%</Text>
            <Text style={styles.statLabel}>Completion</Text>
          </View>

          <View style={styles.stat}>
            <Text style={styles.statValue}>{habit.frequency}</Text>
            <Text style={styles.statLabel}>Target</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.category}>
            {habit.color ? `● ${habit.color}` : 'No Category'}
          </Text>
          <Text style={styles.icon}>
            {habit.icon || '📝'}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  completedCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  completedIndicator: {
    backgroundColor: '#22c55e',
    borderColor: '#16a34a',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  category: {
    fontSize: 12,
    color: '#6366f1',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontWeight: '500',
  },
  difficulty: {
    fontSize: 14,
    color: '#fbbf24',
  },
  icon: {
    fontSize: 20,
  },
});