import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, spacing, borderRadius, fontSize, fontWeight, getShadowStyle } from '../constants/Theme';
import { auth, gamification, userProfiles, challenges as challengesService } from '../services/supabaseService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AchievementsScreen({ navigation }) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [filter, setFilter] = useState('all'); // all, unlocked, locked

  useEffect(() => {
    initializeUser();
  }, []);

  // Refresh achievements and merge local challenge progress when screen focuses
  useEffect(() => {
    if (!navigation) return;
    const unsub = navigation.addListener('focus', async () => {
      try {
        const session = await auth.getCurrentUser();
        const user = session?.data?.user;
        if (user && user.id) {
          await loadAchievements(user.id);
          await loadUserStats(user.id);
          await mergeLocalProgressIntoAchievements();
        }
      } catch (e) {
        console.warn('Error refreshing achievements on focus', e);
      }
    });

    return unsub;
  }, [navigation]);

  const initializeUser = async () => {
    try {
      const { data: { user } } = await auth.getCurrentUser();
      if (user) {
        setUserId(user.id);
        await Promise.all([
          checkPremiumStatus(user.id),
          loadAchievements(user.id),
          loadUserStats(user.id)
        ]);

        // Fetch definitions and user's active challenges to merge template-linked progress
        try {
          const { data: defs } = await gamification.getDefinitions();
          const { data: ucData } = await challengesService.getUserChallenges(user.id);
          if (Array.isArray(defs) && Array.isArray(ucData)) {
            // Attach target_template_id into achievements state where possible
            setAchievements(prev => prev.map(a => {
              const def = defs.find(d => d.id === a.achievement_id);
              if (def && def.target_template_id) {
                const matchedUc = ucData.find(uc => uc.challenge_template_id === def.target_template_id);
                if (matchedUc) {
                  return {
                    ...a,
                    progress: matchedUc.current_completions ?? a.progress,
                    requirement_value: matchedUc.target_completions ?? a.requirement_value
                  };
                }
              }
              return a;
            }));
          }
        } catch (e) {
          console.warn('Failed to merge template-linked achievement progress', e);
        }
      }
    } catch (error) {
      console.error('Error initializing:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPremiumStatus = async (uid) => {
    try {
      const { data } = await userProfiles.isPremium(uid);
      setIsPremium(data);
    } catch (error) {
      console.error('Error checking premium:', error);
    }
  };

  const loadAchievements = async (uid) => {
    try {
      const { data, error } = await gamification.getAchievements(uid);
      if (data) setAchievements(data);
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };

  const mergeLocalProgressIntoAchievements = async () => {
    try {
      const raw = await AsyncStorage.getItem('challengeProgressMap');
      const map = raw ? JSON.parse(raw) : {};
      if (!map || Object.keys(map).length === 0) return;

      setAchievements(prev => prev.map(a => {
        // If local progress exists for an achievement name, merge it in as `progress`
        const entry = map[a.name];
        if (entry && typeof entry.completions === 'number') {
          return { ...a, progress: entry.completions };
        }
        return a;
      }));
    } catch (e) {
      console.warn('Failed to merge local challenge progress into achievements', e);
    }
  }

  const loadUserStats = async (uid) => {
    try {
      const { data, error } = await gamification.getUserStats(uid);
      if (data) setUserStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const getTierColor = (tier) => {
    const colors = {
      bronze: '#CD7F32',
      silver: '#C0C0C0',
      gold: '#FFD700',
      platinum: '#E5E4E2',
      diamond: '#B9F2FF'
    };
    return colors[tier] || colors.bronze;
  };

  const getTierIcon = (tier) => {
    const icons = {
      bronze: 'medal',
      silver: 'medal',
      gold: 'trophy',
      platinum: 'ribbon',
      diamond: 'diamond'
    };
    return icons[tier] || 'medal';
  };

  const filteredAchievements = achievements.filter(a => {
    if (filter === 'unlocked') return a.is_unlocked;
    if (filter === 'locked') return !a.is_unlocked;
    return true;
  });

  const unlockedCount = achievements.filter(a => a.is_unlocked).length;
  const totalPoints = achievements
    .filter(a => a.is_unlocked)
    .reduce((sum, a) => sum + (a.points || 0), 0);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Stats Header */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="trophy" size={32} color="#FFD700" />
            <Text style={styles.statValue}>{unlockedCount}</Text>
            <Text style={styles.statLabel}>Unlocked</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="star" size={32} color={theme.colors.primary} />
            <Text style={styles.statValue}>{totalPoints}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={32} color="#4CAF50" />
            <Text style={styles.statValue}>Lvl {userStats?.current_level || 1}</Text>
            <Text style={styles.statLabel}>Level</Text>
          </View>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilter('all');
            }}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All ({achievements.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'unlocked' && styles.filterButtonActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilter('unlocked');
            }}
          >
            <Text style={[styles.filterText, filter === 'unlocked' && styles.filterTextActive]}>
              Unlocked ({unlockedCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'locked' && styles.filterButtonActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilter('locked');
            }}
          >
            <Text style={[styles.filterText, filter === 'locked' && styles.filterTextActive]}>
              Locked ({achievements.length - unlockedCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Achievements List */}
        <View style={styles.achievementsList}>
          {filteredAchievements.map((achievement) => (
            <TouchableOpacity
              key={achievement.achievement_id}
              style={[
                styles.achievementCard,
                !achievement.is_unlocked && styles.lockedAchievement
              ]}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <View style={[
                styles.achievementIcon,
                { backgroundColor: getTierColor(achievement.tier) + '30' }
              ]}>
                <Ionicons
                  name={achievement.icon || getTierIcon(achievement.tier)}
                  size={40}
                  color={achievement.is_unlocked ? getTierColor(achievement.tier) : theme.colors.textSecondary}
                />
                {!achievement.is_unlocked && (
                  <View style={styles.lockOverlay}>
                    <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
                  </View>
                )}
              </View>

              <View style={styles.achievementContent}>
                <View style={styles.achievementHeader}>
                  <Text style={[
                    styles.achievementName,
                    !achievement.is_unlocked && styles.lockedText
                  ]}>
                    {achievement.name}
                  </Text>
                  <View style={[
                    styles.tierBadge,
                    { backgroundColor: getTierColor(achievement.tier) + '30' }
                  ]}>
                    <Text style={[
                      styles.tierText,
                      { color: getTierColor(achievement.tier) }
                    ]}>
                      {achievement.tier?.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={[
                  styles.achievementDescription,
                  !achievement.is_unlocked && styles.lockedText
                ]}>
                  {achievement.description}
                </Text>

                {/* Progress Bar for locked achievements */}
                {!achievement.is_unlocked && achievement.requirement_value && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(
                              ((achievement.progress || 0) / achievement.requirement_value) * 100,
                              100
                            )}%`,
                            backgroundColor: getTierColor(achievement.tier)
                          }
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {achievement.progress || 0} / {achievement.requirement_value}
                    </Text>
                  </View>
                )}

                <View style={styles.achievementFooter}>
                  <View style={styles.pointsBadge}>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Text style={styles.pointsText}>{achievement.points} pts</Text>
                  </View>
                  {achievement.is_unlocked && achievement.unlocked_at && (
                    <Text style={styles.unlockedDate}>
                      Unlocked {new Date(achievement.unlocked_at).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Premium Upsell */}
        {!isPremium && (
          <TouchableOpacity
            style={styles.premiumCard}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate('Payment');
            }}
          >
            <Ionicons name="star" size={48} color="#FFD700" />
            <Text style={styles.premiumTitle}>Unlock More Achievements!</Text>
            <Text style={styles.premiumSubtitle}>
              Premium members get access to exclusive achievements and faster progression
            </Text>
            <View style={styles.premiumButton}>
              <Text style={styles.premiumButtonText}>Upgrade Now</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginHorizontal: spacing.xs,
    ...getShadowStyle(theme, 'default'),
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: theme.colors.text,
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    backgroundColor: theme.colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
  },
  filterButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  filterText: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: fontWeight.bold,
  },
  achievementsList: {
    marginBottom: spacing.lg,
  },
  achievementCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...getShadowStyle(theme, 'default'),
  },
  lockedAchievement: {
    opacity: 0.6,
  },
  achievementIcon: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  achievementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  achievementName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: theme.colors.text,
    flex: 1,
  },
  lockedText: {
    color: theme.colors.textSecondary,
  },
  tierBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  tierText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  achievementDescription: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: spacing.sm,
  },
  progressContainer: {
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.background,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  progressText: {
    fontSize: fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  achievementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700' + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  pointsText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: '#FFD700',
    marginLeft: 4,
  },
  unlockedDate: {
    fontSize: fontSize.xs,
    color: theme.colors.textSecondary,
  },
  premiumCard: {
    backgroundColor: theme.colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...getShadowStyle(theme, 'large'),
  },
  premiumTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: theme.colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  premiumSubtitle: {
    fontSize: fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  premiumButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    ...getShadowStyle(theme, 'default'),
  },
  premiumButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    marginRight: spacing.sm,
  },
});
