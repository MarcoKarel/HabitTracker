import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, spacing, borderRadius, fontSize, fontWeight, getShadowStyle } from '../constants/Theme';
import { auth, challenges, habits as habitsService, userProfiles } from '../services/supabaseService';

export default function ChallengesScreen({ navigation }) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [userHabits, setUserHabits] = useState([]);

  useEffect(() => {
    initializeUser();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (userId) {
        loadData();
      }
    });
    return unsubscribe;
  }, [navigation, userId]);

  const initializeUser = async () => {
    try {
      const { data: { user } } = await auth.getCurrentUser();
      if (user) {
        setUserId(user.id);
        await checkPremiumStatus(user.id);
        await loadData(user.id);
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

  const loadData = async (uid = userId) => {
    try {
      const [challengesRes, templatesRes, habitsRes] = await Promise.all([
        challenges.getUserChallenges(uid),
        challenges.getTemplates(isPremium),
        habitsService.getAll(uid)
      ]);

      if (challengesRes.data) setActiveChallenges(challengesRes.data);
      if (templatesRes.data) setTemplates(templatesRes.data);
      if (habitsRes.data) setUserHabits(habitsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleCreateChallenge = async (templateId, habitId) => {
    if (!isPremium && templates.find(t => t.id === templateId)?.is_premium) {
      showPremiumAlert();
      return;
    }

    try {
      const template = templates.find(t => t.id === templateId);
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + template.duration_days);

      const { data, error } = await challenges.createChallenge({
        user_id: userId,
        challenge_template_id: templateId,
        habit_id: habitId,
        name: template.name,
        description: template.description,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        target_completions: template.required_completions,
        is_public: false
      });

      if (error) {
        Alert.alert('Error', 'Failed to create challenge');
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success!', `Challenge "${template.name}" created! Let's do this! 🎯`);
      setShowCreateModal(false);
      loadData();
    } catch (error) {
      console.error('Error creating challenge:', error);
      Alert.alert('Error', 'Failed to create challenge');
    }
  };

  const handleAbandonChallenge = (challengeId, challengeName) => {
    Alert.alert(
      'Abandon Challenge?',
      `Are you sure you want to abandon "${challengeName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Abandon',
          style: 'destructive',
          onPress: async () => {
            const { error } = await challenges.abandonChallenge(challengeId);
            if (!error) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              loadData();
            }
          }
        }
      ]
    );
  };

  const showPremiumAlert = () => {
    Alert.alert(
      '🌟 Premium Feature',
      'This challenge requires Premium. Upgrade now to access all challenges!',
      [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Upgrade', onPress: () => navigation.navigate('Payment') }
      ]
    );
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      easy: '#4CAF50',
      medium: '#FF9800',
      hard: '#F44336',
      extreme: '#9C27B0'
    };
    return colors[difficulty] || colors.medium;
  };

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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Challenges</Text>
          <Text style={styles.headerSubtitle}>
            Push your limits with structured challenges
          </Text>
        </View>

        {/* Active Challenges */}
        {activeChallenges.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Active Challenges</Text>
            {activeChallenges.map((challenge) => (
              <TouchableOpacity
                key={challenge.id}
                style={styles.challengeCard}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <View style={styles.challengeHeader}>
                  <View style={styles.challengeIcon}>
                    <Ionicons name="trophy" size={24} color="#FFD700" />
                  </View>
                  <View style={styles.challengeInfo}>
                    <Text style={styles.challengeName}>{challenge.name}</Text>
                    <Text style={styles.challengeDays}>
                      {challenge.days_remaining} days remaining
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleAbandonChallenge(challenge.id, challenge.name)}
                    style={styles.abandonButton}
                  >
                    <Ionicons name="close-circle" size={24} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(challenge.progress_percentage || 0, 100)}%`,
                          backgroundColor: theme.colors.primary
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {challenge.current_completions} / {challenge.target_completions}
                  </Text>
                </View>

                <View style={styles.challengeStats}>
                  <View style={styles.statItem}>
                    <Ionicons name="calendar" size={16} color={theme.colors.textSecondary} />
                    <Text style={styles.statText}>
                      {new Date(challenge.start_date).toLocaleDateString()} - {new Date(challenge.end_date).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Challenge Templates */}
        <View style={styles.templatesHeader}>
          <Text style={styles.sectionTitle}>Available Challenges</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowCreateModal(true);
            }}
          >
            <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {templates.map((template) => (
          <TouchableOpacity
            key={template.id}
            style={[
              styles.templateCard,
              !isPremium && template.is_premium && styles.lockedTemplate
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (!isPremium && template.is_premium) {
                showPremiumAlert();
              } else {
                setSelectedTemplate(template);
                setShowCreateModal(true);
              }
            }}
          >
            <View style={[styles.templateIcon, { backgroundColor: template.color + '30' }]}>
              <Ionicons name={template.icon || 'trophy'} size={32} color={template.color} />
              {!isPremium && template.is_premium && (
                <View style={styles.lockBadge}>
                  <Ionicons name="lock-closed" size={12} color="#FFFFFF" />
                </View>
              )}
            </View>

            <View style={styles.templateInfo}>
              <View style={styles.templateTitleRow}>
                <Text style={styles.templateName}>{template.name}</Text>
                {!isPremium && template.is_premium && (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="star" size={12} color="#FFD700" />
                    <Text style={styles.premiumBadgeText}>PRO</Text>
                  </View>
                )}
              </View>
              <Text style={styles.templateDescription}>{template.description}</Text>
              
              <View style={styles.templateMeta}>
                <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(template.difficulty) + '30' }]}>
                  <Text style={[styles.difficultyText, { color: getDifficultyColor(template.difficulty) }]}>
                    {template.difficulty?.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.durationText}>
                  {template.duration_days} days
                </Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Create Challenge Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Start Challenge</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={28} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {selectedTemplate && (
              <>
                <Text style={styles.modalSubtitle}>{selectedTemplate.name}</Text>
                <Text style={styles.modalDescription}>{selectedTemplate.description}</Text>

                <Text style={styles.selectHabitLabel}>Select a habit for this challenge:</Text>
                <ScrollView style={styles.habitsList}>
                  {userHabits.map((habit) => (
                    <TouchableOpacity
                      key={habit.id}
                      style={styles.habitOption}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        handleCreateChallenge(selectedTemplate.id, habit.id);
                      }}
                    >
                      <View style={[styles.habitIconSmall, { backgroundColor: habit.color + '30' }]}>
                        <Ionicons name={habit.icon || 'checkmark'} size={20} color={habit.color} />
                      </View>
                      <Text style={styles.habitOptionText}>{habit.name}</Text>
                      <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  header: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: fontSize.md,
    color: theme.colors.textSecondary,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: theme.colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  challengeCard: {
    backgroundColor: theme.colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...getShadowStyle(2),
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  challengeIcon: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    backgroundColor: '#FFD700' + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  challengeName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: theme.colors.text,
  },
  challengeDays: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
  },
  abandonButton: {
    padding: spacing.xs,
  },
  progressContainer: {
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 8,
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
    fontSize: fontSize.sm,
    color: theme.colors.text,
    textAlign: 'right',
    fontWeight: fontWeight.semibold,
  },
  challengeStats: {
    marginTop: spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: spacing.xs,
  },
  templatesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  createButton: {
    padding: spacing.xs,
  },
  templateCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
    ...getShadowStyle(1),
  },
  lockedTemplate: {
    opacity: 0.7,
  },
  templateIcon: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lockBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  templateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  templateName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: theme.colors.text,
    flex: 1,
  },
  premiumBadge: {
    flexDirection: 'row',
    backgroundColor: '#FFD700' + '30',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  premiumBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: '#FFD700',
    marginLeft: 4,
  },
  templateDescription: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: spacing.sm,
  },
  templateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  difficultyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
  },
  difficultyText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  durationText: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: theme.colors.text,
  },
  modalSubtitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  modalDescription: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: spacing.lg,
  },
  selectHabitLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  habitsList: {
    maxHeight: 300,
  },
  habitOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  habitIconSmall: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitOptionText: {
    flex: 1,
    marginLeft: spacing.md,
    fontSize: fontSize.md,
    color: theme.colors.text,
  },
});
