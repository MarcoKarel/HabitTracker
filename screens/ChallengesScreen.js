import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, spacing, borderRadius, fontSize, fontWeight, getShadowStyle } from '../constants/Theme';
import { auth, challenges as challengesService, habits as habitsService, gamification as gamificationService, userProfiles } from '../services/supabaseService';

const STORAGE_KEYS = {
  PROGRESS_MAP: 'challengeProgressMap',
  ACTIVE: 'activeChallengeName',
  HABIT_MAP: 'challengeHabitMap',
  CHALLENGE_MAP: 'challengeUserMap'
};

export default function ChallengesScreen({ navigation }) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [templates, setTemplates] = useState([]);
  const [userChallenges, setUserChallenges] = useState([]);
  const [activeCount, setActiveCount] = useState(0);
  const [maxActive, setMaxActive] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    try {
      const { data: { user } } = await auth.getCurrentUser();
      const uid = user?.id;
      if (uid) setUserId(uid);

      // Fetch all templates (include premium ones) so the screen shows available rows.
      // In production you may want to filter based on user's premium status.
      const { data, error } = await challengesService.getTemplates(true);
      if (error) {
        console.warn('Error fetching challenge templates', error);
        setErrorMsg(error.message || JSON.stringify(error));
      } else {
        console.debug('Challenge templates fetched:', (data || []).length);
        setTemplates(data || []);
        // If user is signed in, fetch their active challenges to show progress on cards and enforce limits
        if (uid) {
          try {
            // Load user's achievements and map any achievement that targets a challenge template
            const { data: achData, error: achErr } = await gamificationService.getAchievements(uid);
            if (!achErr && Array.isArray(achData)) {
              const mapped = achData
                .filter(a => a.target_template_id)
                .map(a => ({
                  challenge_template_id: a.target_template_id,
                  current_completions: a.progress ?? 0,
                  target_completions: a.requirement_value ?? 0,
                  name: a.name
                }));
              setUserChallenges(mapped);
            }
            // Fetch active user_challenges count
            try {
              const { data: ucData } = await challengesService.getUserChallenges(uid);
              const count = Array.isArray(ucData) ? ucData.length : 0;
              setActiveCount(count);
            } catch (e) {
              console.warn('Failed to load active challenges count', e);
            }

            // Determine max allowed based on premium status
            try {
              const { data: isPremiumFlag } = await userProfiles.isPremium(uid);
              const isPremium = !!isPremiumFlag;
              setMaxActive(isPremium ? 3 : 1);
            } catch (e) {
              console.warn('Failed to check premium status', e);
            }
          } catch (e) {
            console.warn('Failed to load achievements for challenge progress', e);
          }
        }
        if (!data || (Array.isArray(data) && data.length === 0)) {
          setErrorMsg('No challenge templates returned from Supabase. Check configuration (SUPABASE_URL/SUPABASE_ANON_KEY) and RLS policies.');
        } else {
          setErrorMsg(null);
        }
      }
    } catch (e) {
      console.warn('Init challenges error', e);
    } finally {
      setLoading(false);
    }
  };

  const onStart = async (template) => {
    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in to start a challenge.');
      return;
    }

    try {
      setLoading(true);

      // Use helper that creates a habit from the template and creates the linked user_challenge.
      const { data: result, error } = await challengesService.startChallengeFromTemplate(userId, template.id);
      if (error) {
        console.warn('Failed to start challenge from template', error);
        Alert.alert('Error', error.message || 'Failed to start challenge');
        return;
      }

      const habit = result?.habit;
      const ucData = result?.challenge;

      // Save active challenge name and map template -> habit id so HabitsScreen can use it
      try {
        const activeName = template.name;
        await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE, activeName);

        const rawMap = await AsyncStorage.getItem(STORAGE_KEYS.HABIT_MAP);
        const map = rawMap ? JSON.parse(rawMap) : {};
        if (habit?.id) map[activeName] = habit.id;
        await AsyncStorage.setItem(STORAGE_KEYS.HABIT_MAP, JSON.stringify(map));

        const rawChallengeMap = await AsyncStorage.getItem(STORAGE_KEYS.CHALLENGE_MAP);
        const challengeMap = rawChallengeMap ? JSON.parse(rawChallengeMap) : {};
        if (ucData?.id) challengeMap[activeName] = ucData.id;
        await AsyncStorage.setItem(STORAGE_KEYS.CHALLENGE_MAP, JSON.stringify(challengeMap));
      } catch (e) {
        console.warn('Failed to persist active challenge locally', e);
      }

      // Refresh progress from achievements so cards show immediately
      try {
        const { data: achDataArr, error: achErr } = await gamificationService.getAchievements(userId);
        if (!achErr && Array.isArray(achDataArr)) {
          const mapped = achDataArr
            .filter(a => a.target_template_id)
            .map(a => ({
              challenge_template_id: a.target_template_id,
              current_completions: a.progress ?? 0,
              target_completions: a.requirement_value ?? 0,
              name: a.name
            }));
          setUserChallenges(mapped);
          // Increase active count since a new challenge was created
          setActiveCount(prev => prev + 1);
        }
      } catch (e) {
        console.warn('Failed to refresh challenge progress after starting', e);
      }

      Alert.alert('Challenge started', `${template.name} has been added to your habits.`);
      // Navigate to Habits screen for the user to see the newly created habit
      navigation?.navigate('Habits');
    } catch (e) {
      console.warn('Start template error', e);
      Alert.alert('Error', 'Failed to start challenge');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const matched = userChallenges && Array.isArray(userChallenges)
      ? userChallenges.find(uc => uc.challenge_template_id === item.id || uc.name === item.name)
      : null;

    const canStart = matched ? true : (activeCount < maxActive);

    const current = matched?.current_completions ?? 0;
    const target = matched?.target_completions ?? item.required_completions ?? item.duration_days ?? 0;
    const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

    const isActive = !!matched;

    return (
      <View style={[
        styles.card,
        { borderLeftColor: item.color || theme.colors.primary },
        isActive ? styles.activeCard : null
      ]}> 
        <View style={[styles.cardContent, isActive ? styles.activeCardContent : null]}>
          <View style={styles.titleRow}>
            <View style={styles.titleContainer}>
              <Text style={[styles.title, isActive ? styles.titleActive : null]}>{item.name}</Text>
              {item.is_premium && (
                <View style={styles.premiumBadge}>
                  <Ionicons name="lock-closed" size={12} color="#fff" style={styles.lockIcon} />
                  <Text style={styles.premiumText}>Premium</Text>
                </View>
              )}
              {matched && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              )}
            </View>
            <Text style={styles.duration}>{item.duration_days ? `${item.duration_days}d` : ''}</Text>
          </View>
          {item.description ? (
            <Text style={[styles.description, isActive ? styles.descriptionActive : null]} numberOfLines={2}>{item.description}</Text>
          ) : null}

          <View style={styles.progressRow}>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${percent}%`, backgroundColor: item.color || theme.colors.primary }]} />
            </View>
            <Text style={styles.progressText}>{`${current}/${target || '—'}`}</Text>
          </View>

          {isActive && (
            <View style={styles.progressDetailRow}>
              <Text style={styles.progressDetail}>{`Progress: ${current}/${target || '—'} (${percent}%)`}</Text>
            </View>
          )}

          <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.startButton, { backgroundColor: theme.colors.primary, opacity: canStart ? 1 : 0.5 }]}
                onPress={() => {
                  if (!canStart) {
                    Alert.alert('Limit reached', `You can only have ${maxActive} active challenge${maxActive>1?'s':''} at a time. Upgrade to Premium to add more.`);
                    return;
                  }
                  onStart(item);
                }}
                disabled={!canStart}
              >
                <Text style={styles.startText}>{matched ? 'Open' : 'Start'}</Text>
              </TouchableOpacity>

            <TouchableOpacity style={[styles.doTodayButton, { backgroundColor: theme.colors.primaryVariant || theme.colors.accent }]} onPress={() => Alert.alert('Do Today', 'Use the Habits screen to mark progress.') }>
              <Text style={styles.doTodayText}>Do Today</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const checkConnection = async () => {
    setLoading(true);
    try {
      const res = await challengesService.getTemplates(true);
      if (res?.error) {
        Alert.alert('Supabase Error', res.error.message || JSON.stringify(res.error));
      } else if (Array.isArray(res?.data)) {
        Alert.alert('Supabase OK', `Templates: ${res.data.length}\nFirst: ${res.data[0]?.name || '—'}`);
      } else {
        Alert.alert('Supabase', 'No data returned');
      }
    } catch (e) {
      Alert.alert('Check Error', e.message || JSON.stringify(e));
    } finally {
      setLoading(false);
    }
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
      <View style={styles.headerRow}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Challenges</Text>
          <Text style={styles.headerSubtitle}>{`Active: ${activeCount}/${maxActive}`}</Text>
        </View>
        <TouchableOpacity style={styles.upgradeButton} onPress={() => navigation?.navigate('Payment')}>
          <Text style={styles.upgradeText}>Upgrade</Text>
        </TouchableOpacity>
      </View>
      {errorMsg && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.debugButton} onPress={checkConnection}>
            <Text style={styles.debugButtonText}>Check Supabase</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={templates}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: theme.colors.text,
  },
  headerSubtitle: {
    marginTop: spacing.xs,
    color: theme.colors.textSecondary,
    fontSize: fontSize.sm,
  },
  upgradeButton: {
    marginRight: spacing.md,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  upgradeText: {
    color: '#fff',
    fontWeight: fontWeight.semibold,
  },
  list: {
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderLeftWidth: 6,
    borderColor: theme.colors.primary,
    ...getShadowStyle(theme, 'default'),
  },
  cardContent: {
    flex: 1,
    padding: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryVariant || theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: spacing.sm,
  },
  activeBadge: {
    marginLeft: spacing.sm,
    backgroundColor: theme.colors.success || '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  premiumText: {
    color: '#FFFFFF',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  lockIcon: {
    marginRight: 6,
  },
  errorContainer: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
  },
  errorText: {
    color: theme.colors.textSecondary,
    marginBottom: spacing.sm,
  },
  debugButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  debugButtonText: {
    color: '#fff',
    fontWeight: fontWeight.semibold,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: theme.colors.text,
  },
  duration: {
    color: theme.colors.textSecondary,
    fontSize: fontSize.sm,
  },
  description: {
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
    fontSize: fontSize.md,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  progressDetailRow: {
    marginTop: spacing.xs,
  },
  progressDetail: {
    color: theme.colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  activeCard: {
    opacity: 0.85,
    backgroundColor: theme.colors.surfaceVariant,
  },
  activeCardContent: {
    // slightly dim inner content when active
  },
  titleActive: {
    color: theme.colors.textSecondary,
  },
  descriptionActive: {
    color: theme.colors.textSecondary,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    color: theme.colors.textSecondary,
    fontSize: fontSize.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
  },
  startButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  startText: {
    color: '#fff',
    fontWeight: fontWeight.semibold,
  },
  doTodayButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  doTodayText: {
    color: '#fff',
    fontWeight: fontWeight.semibold,
  },
});
