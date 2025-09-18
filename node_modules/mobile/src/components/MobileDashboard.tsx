import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Platform,
  StatusBar,
  SafeAreaView,
  Animated
} from 'react-native';
import { HabitCard, MobileHabitForm } from './habits';
import type { HabitWithCompletions, Habit } from '@habit-tracker/shared';

const { width, height } = Dimensions.get('window');

interface MobileDashboardProps {
  habits: HabitWithCompletions[];
  onToggleHabit: (habitId: string) => Promise<void>;
  onCreateHabit: (data: any) => Promise<void>;
  onUpdateHabit: (habitId: string, data: any) => Promise<void>;
  onDeleteHabit: (habitId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  loading: boolean;
}

export function MobileDashboard({
  habits,
  onToggleHabit,
  onCreateHabit,
  onUpdateHabit,
  onDeleteHabit,
  onRefresh,
  loading
}: MobileDashboardProps) {
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [headerOpacity] = useState(new Animated.Value(0));
  const [fabScale] = useState(new Animated.Value(1));

  // Calculate stats
  const totalHabits = habits.length;
  const completedToday = habits.filter(h => h.is_completed_today).length;
  const totalStreak = habits.reduce((sum, h) => sum + (h.current_streak || 0), 0);
  const completionRate = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;

  useEffect(() => {
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true
    }).start();
  }, []);

  const handleHabitEdit = (habit: HabitWithCompletions) => {
    setEditingHabit(habit as Habit);
    setShowHabitForm(true);
  };

  const handleHabitFormSubmit = async (data: any) => {
    if (editingHabit) {
      await onUpdateHabit(editingHabit.id, data);
    } else {
      await onCreateHabit(data);
    }
    setEditingHabit(null);
    setShowHabitForm(false);
  };

  const handleFabPress = () => {
    // Scale animation
    Animated.sequence([
      Animated.timing(fabScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(fabScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();

    // Simple console feedback instead of haptics
    console.log('Add habit button pressed');

    setShowHabitForm(true);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const renderHeader = () => (
    <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
      <View style={styles.greetingSection}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.subtitle}>Keep building great habits!</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#4ecdc4' }]}>
              <Text style={styles.statIconText}>✓</Text>
            </View>
            <Text style={styles.statValue}>{completedToday}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#ff6b6b' }]}>
              <Text style={styles.statIconText}>🔥</Text>
            </View>
            <Text style={styles.statValue}>{totalStreak}</Text>
            <Text style={styles.statLabel}>Total Streak</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#45b7d1' }]}>
              <Text style={styles.statIconText}>📈</Text>
            </View>
            <Text style={styles.statValue}>{completionRate}%</Text>
            <Text style={styles.statLabel}>Completion</Text>
          </View>
        </View>

        {/* Progress Ring */}
        <View style={styles.progressSection}>
          <View style={styles.progressRing}>
            <View style={[
              styles.progressFill,
              {
                transform: [{
                  rotate: `${(completionRate / 100) * 360}deg`
                }]
              }
            ]} />
            <View style={styles.progressCenter}>
              <Text style={styles.progressText}>{completionRate}%</Text>
              <Text style={styles.progressSubtext}>Complete</Text>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Text style={styles.emptyIcon}>🌱</Text>
      </View>
      <Text style={styles.emptyTitle}>Start Your Journey</Text>
      <Text style={styles.emptyDescription}>
        Create your first habit and begin building a better you, one day at a time.
      </Text>
      <TouchableOpacity 
        style={styles.emptyButton}
        onPress={() => setShowHabitForm(true)}
      >
        <Text style={styles.statIconText}>+</Text>
        <Text style={styles.emptyButtonText}>Create First Habit</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      {habits.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyScrollContainer}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={onRefresh}
              tintColor="#667eea"
            />
          }
        >
          {renderEmptyState()}
        </ScrollView>
      ) : (
        <>
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={onRefresh}
                tintColor="#667eea"
              />
            }
          >
            {renderHeader()}

            <View style={styles.habitsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Habits</Text>
                <Text style={styles.sectionSubtitle}>
                  {totalHabits} habit{totalHabits !== 1 ? 's' : ''}
                </Text>
              </View>

              {habits.map((habit, index) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  onToggle={onToggleHabit}
                  onEdit={handleHabitEdit}
                  index={index}
                />
              ))}
            </View>

            {/* Bottom padding for FAB */}
            <View style={styles.bottomPadding} />
          </ScrollView>

          {/* Floating Action Button */}
          <Animated.View style={[
            styles.fab,
            { transform: [{ scale: fabScale }] }
          ]}>
            <TouchableOpacity
              style={styles.fabButton}
              onPress={handleFabPress}
              activeOpacity={0.8}
            >
              <Text style={styles.addButtonIcon}>+</Text>
            </TouchableOpacity>
          </Animated.View>
        </>
      )}

      {/* Habit Form Modal */}
      <MobileHabitForm
        visible={showHabitForm}
        habit={editingHabit || undefined}
        onSave={handleHabitFormSubmit}
        onClose={() => {
          setShowHabitForm(false);
          setEditingHabit(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  emptyScrollContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    marginBottom: 16,
  },
  greetingSection: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  statsContainer: {
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    marginHorizontal: 4,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#333',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  progressSection: {
    alignItems: 'center',
  },
  progressRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '50%',
    height: '100%',
    backgroundColor: '#667eea',
    transformOrigin: 'right center',
  },
  progressCenter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#333',
  },
  progressSubtext: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  habitsSection: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  bottomPadding: {
    height: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  fabButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  statIconText: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    color: '#ddd',
  },
  addButtonIcon: {
    fontSize: 28,
    color: 'white',
    fontWeight: 'bold',
  },
});