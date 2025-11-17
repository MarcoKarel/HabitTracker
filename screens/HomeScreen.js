import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Easing, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, spacing, borderRadius, fontSize, fontWeight, getShadowStyle } from '../constants/Theme';
import { auth, habits as habitsService, habitCompletions, userProfiles } from '../services/supabaseService';

export default function HomeScreen({ navigation }) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { colorMode, setColorMode } = theme;
  const [habits, setHabits] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [todaysProgress, setTodaysProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [habitCount, setHabitCount] = useState(0);
  const [habitLimit] = useState(5); // Free tier limit

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [progressAnim] = useState(new Animated.Value(0));
  const [cardAnimations] = useState([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0)
  ]);

  useEffect(() => {
    initializeUser();
    
    // Staggered entrance animation
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
    ]).start(() => {
      // Animate stat cards with stagger
      const cardAnimationPromises = cardAnimations.map((anim, index) => 
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          delay: index * 100,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        })
      );
      
      Animated.stagger(100, cardAnimationPromises).start();
    });
  }, []);

  const initializeUser = async () => {
    try {
      const { data: { user } } = await auth.getCurrentUser();
      if (user) {
        setUserId(user.id);
        await Promise.all([
          loadData(user.id),
          checkPremiumStatus(user.id)
        ]);
      }
    } catch (error) {
      console.error('Error initializing user:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPremiumStatus = async (uid) => {
    try {
      const { data } = await userProfiles.isPremium(uid);
      setIsPremium(data);
      const { data: count } = await habitsService.getHabitCount(uid);
      setHabitCount(count || 0);
    } catch (error) {
      console.error('Error checking premium status:', error);
    }
  };

  // Add a header right button to toggle theme mode (system -> dark -> light)
  useEffect(() => {
    const cycleMode = () => {
      const next = colorMode === 'system' ? 'dark' : colorMode === 'dark' ? 'light' : 'system';
      setColorMode(next);
    };

    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={cycleMode} style={{ marginRight: 12 }}>
          <Ionicons name={colorMode === 'dark' ? 'moon' : colorMode === 'light' ? 'sunny' : 'color-filter'} size={22} color={theme.colors.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, colorMode, setColorMode, theme.colors.text]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (userId) {
        loadData(userId);
      }
    });

    return unsubscribe;
  }, [navigation, userId]);

  useEffect(() => {
    // Animate progress bar when progress changes
    Animated.timing(progressAnim, {
      toValue: todaysProgress / 100,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [todaysProgress]);

  const loadData = async (uid) => {
    try {
      // Load habits from Supabase
      const { data: habitsData, error: habitsError } = await habitsService.getAll(uid);
      if (habitsError) {
        console.error('Error loading habits:', habitsError);
        return;
      }
      
      // Load completions from Supabase
      const { data: completionsData, error: completionsError } = await habitCompletions.getAll(uid);
      if (completionsError) {
        console.error('Error loading completions:', completionsError);
        return;
      }
      
      setHabits(habitsData || []);
      setCompletions(completionsData || []);
      calculateTodaysProgress(habitsData || [], completionsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const calculateTodaysProgress = (habitsData, completionsData) => {
    if (habitsData.length === 0) {
      setTodaysProgress(0);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const todaysCompletions = completionsData.filter(c => c.date === today);
    const progress = (todaysCompletions.length / habitsData.length) * 100;
    setTodaysProgress(Math.round(progress));
  };

  const getMotivationalMessage = () => {
    if (todaysProgress === 100) {
      return "🎉 Perfect day! You've completed all your habits!";
    } else if (todaysProgress >= 75) {
      return "🌟 Almost there! Just a few more habits to go!";
    } else if (todaysProgress >= 50) {
      return "💪 Great progress! Keep up the momentum!";
    } else if (todaysProgress > 0) {
      return "🌱 Good start! Every step counts!";
    } else {
      return "☀️ New day, new opportunities! Let's get started!";
    }
  };

  const getStreakData = () => {
    const streaks = habits.map(habit => {
      const habitCompletionsList = completions
        .filter(c => c.habit_id === habit.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      let streak = 0;
      const today = new Date();
      
      for (let i = 0; i < habitCompletionsList.length; i++) {
        const completionDate = new Date(habitCompletionsList[i].date);
        const daysDiff = Math.floor((today - completionDate) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === streak) {
          streak++;
        } else {
          break;
        }
      }
      
      return { habit: habit.name, streak };
    });

    return streaks.sort((a, b) => b.streak - a.streak);
  };

  const handleButtonPress = (callback) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (callback) callback();
  };

  const renderQuickStat = (title, value, icon, color, index) => (
    <Animated.View 
      style={[
        styles.statCard, 
        { 
          borderColor: color,
          transform: [{ scale: cardAnimations[index] }],
          opacity: cardAnimations[index],
        }
      ]}
    >
      <Animated.View style={{
        transform: [{ 
          rotate: cardAnimations[index].interpolate({
            inputRange: [0, 1],
            outputRange: ['-10deg', '0deg']
          })
        }]
      }}>
        <Ionicons name={icon} size={24} color={color} />
      </Animated.View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </Animated.View>
  );

  const topStreaks = getStreakData().slice(0, 3);
  const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Animated.ScrollView 
      style={[styles.container, { opacity: fadeAnim }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={[styles.header, { transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.greeting}>Good {getTimeOfDay()}!</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</Text>
      </Animated.View>

      <Animated.View style={[styles.progressCard, { transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.progressTitle}>Today's Progress</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View 
              style={[
                styles.progressFill, 
                { 
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  })
                }
              ]} 
            />
          </View>
          <Animated.Text style={[
            styles.progressText,
            {
              transform: [{
                scale: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1]
                })
              }]
            }
          ]}>
            {todaysProgress}%
          </Animated.Text>
        </View>
        <Text style={styles.motivationText}>{getMotivationalMessage()}</Text>
      </Animated.View>

      <View style={styles.statsContainer}>
        {renderQuickStat('Total Habits', habits.length, 'list', '#007AFF', 0)}
        {renderQuickStat('Completed Today', 
          completions.filter(c => c.date === new Date().toISOString().split('T')[0]).length, 
          'checkmark-circle', '#34C759', 1)}
        {renderQuickStat('Best Streak', 
          topStreaks.length > 0 ? `${topStreaks[0].streak} days` : '0 days', 
          'flame', '#FF6B35', 2)}
      </View>

      {topStreaks.length > 0 && (
        <Animated.View style={[
          styles.streaksCard,
          { 
            opacity: fadeAnim,
            transform: [{ 
              translateY: slideAnim.interpolate({
                inputRange: [0, 50],
                outputRange: [20, 0]
              })
            }]
          }
        ]}>
          <Text style={styles.streaksTitle}>🔥 Top Streaks</Text>
          {topStreaks.map((item, index) => (
            <Animated.View 
              key={index} 
              style={[
                styles.streakItem,
                {
                  opacity: cardAnimations[Math.min(index, 2)],
                  transform: [{ 
                    translateX: cardAnimations[Math.min(index, 2)].interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0]
                    })
                  }]
                }
              ]}
            >
              <Text style={styles.streakHabit}>{item.habit}</Text>
              <Text style={styles.streakCount}>{item.streak} days</Text>
            </Animated.View>
          ))}
        </Animated.View>
      )}

      {/* Premium Status Card */}
      {!isPremium && (
        <AnimatedTouchableOpacity 
          style={[styles.premiumCard, { opacity: fadeAnim }]}
          onPress={() => handleButtonPress(() => navigation.navigate('Payment'))}
          activeOpacity={0.8}
        >
          <View style={styles.premiumContent}>
            <View style={styles.premiumIconContainer}>
              <Ionicons name="star" size={32} color="#FFD700" />
            </View>
            <View style={styles.premiumTextContainer}>
              <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
              <Text style={styles.premiumSubtitle}>
                {habitCount >= habitLimit 
                  ? `You've reached the ${habitLimit} habit limit • Unlock unlimited habits!`
                  : 'Unlock unlimited habits, advanced analytics & more'
                }
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
          </View>
          {habitCount >= habitLimit && (
            <View style={styles.limitBanner}>
              <Ionicons name="alert-circle" size={16} color="#FF9800" />
              <Text style={styles.limitBannerText}>
                {habitCount}/{habitLimit} habits used
              </Text>
            </View>
          )}
        </AnimatedTouchableOpacity>
      )}

      {/* Premium Badge for Premium Users */}
      {isPremium && (
        <AnimatedTouchableOpacity 
          style={[styles.premiumBadgeCard, { opacity: fadeAnim }]}
          onPress={() => handleButtonPress(() => navigation.navigate('PremiumFeatures'))}
          activeOpacity={0.8}
        >
          <View style={styles.premiumBadgeContent}>
            <View style={styles.premiumBadgeIcon}>
              <Ionicons name="star" size={20} color="#FFD700" />
            </View>
            <Text style={styles.premiumBadgeText}>Premium Member</Text>
            <Text style={styles.premiumBadgeSubtext}>• Tap to view features</Text>
          </View>
        </AnimatedTouchableOpacity>
      )}

      <View style={styles.actionsContainer}>
        <AnimatedTouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleButtonPress(() => navigation.navigate('Habits'))}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-done" size={24} color="white" />
          <Text style={styles.actionButtonText}>Track Habits</Text>
        </AnimatedTouchableOpacity>
        
        <AnimatedTouchableOpacity 
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => handleButtonPress(() => navigation.navigate('Statistics'))}
          activeOpacity={0.8}
        >
          <Ionicons name="bar-chart" size={24} color={theme.colors.primary} />
          <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>View Stats</Text>
        </AnimatedTouchableOpacity>
      </View>
    </Animated.ScrollView>
  );
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    backgroundColor: theme.colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
    ...getShadowStyle(theme, 'small'),
  },
  greeting: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  date: {
    fontSize: fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  progressCard: {
    backgroundColor: theme.colors.card,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    ...getShadowStyle(theme, 'default'),
  },
  progressTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
    color: theme.colors.text,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 10,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.sm,
    marginRight: spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.sm,
  },
  progressText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: theme.colors.primary,
    minWidth: 40,
  },
  motivationText: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    ...getShadowStyle(theme, 'small'),
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginTop: spacing.sm,
    color: theme.colors.text,
  },
  statTitle: {
    fontSize: fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    lineHeight: 16,
  },
  streaksCard: {
    backgroundColor: theme.colors.card,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    ...getShadowStyle(theme, 'default'),
  },
  streaksTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
    color: theme.colors.text,
  },
  streakItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceVariant,
  },
  streakHabit: {
    fontSize: fontSize.md,
    color: theme.colors.text,
    flex: 1,
  },
  streakCount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: theme.colors.warning,
    marginLeft: spacing.sm,
  },
  actionsContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    ...getShadowStyle(theme, 'default'),
  },
  secondaryButton: {
    backgroundColor: theme.colors.card,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginLeft: spacing.sm,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
  },
  premiumCard: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: '#FFD700',
    overflow: 'hidden',
    ...getShadowStyle(theme, 'default'),
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  premiumIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumTextContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  premiumTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: theme.colors.text,
  },
  premiumSubtitle: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
  },
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  limitBannerText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: '#FF9800',
    marginLeft: spacing.xs,
  },
  premiumBadgeCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    ...getShadowStyle(theme, 'small'),
  },
  premiumBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  premiumBadgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBadgeText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: theme.colors.text,
    marginLeft: spacing.sm,
  },
  premiumBadgeSubtext: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: spacing.xs,
  },
});