import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Share,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { useTheme, spacing, borderRadius, fontSize, fontWeight, getShadowStyle } from '../constants/Theme';
import { auth, userProfiles, dataExport, habits as habitsService, habitCompletions } from '../services/supabaseService';

export default function PremiumFeaturesScreen({ navigation }) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);

  useEffect(() => {
    initializeUser();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (userId) {
        checkPremiumStatus(userId);
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
      }
    } catch (error) {
      console.error('Error initializing user:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPremiumStatus = async (uid) => {
    try {
      const { data: premium } = await userProfiles.isPremium(uid);
      const { data: subInfo } = await userProfiles.getSubscriptionInfo(uid);
      setIsPremium(premium);
      setSubscriptionInfo(subInfo);
    } catch (error) {
      console.error('Error checking premium status:', error);
    }
  };

  const handleExportData = async (format = 'json') => {
    if (!isPremium) {
      showPremiumAlert();
      return;
    }

    try {
      setExporting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Get all user data
      const { data: exportData, error } = await dataExport.exportUserData(userId);
      
      if (error) {
        Alert.alert('Error', 'Failed to export data');
        return;
      }

      let fileData, filename, mimeType;

      if (format === 'json') {
        const result = dataExport.downloadAsJSON(exportData);
        fileData = result.data;
        filename = result.filename;
        mimeType = result.mimeType;
      } else if (format === 'csv') {
        const { data: habits } = await habitsService.getAll(userId);
        const { data: completions } = await habitCompletions.getAll(userId);
        const result = dataExport.downloadAsCSV(habits, completions);
        fileData = result.data;
        filename = result.filename;
        mimeType = result.mimeType;
      }

      // Save and share file
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, fileData);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType,
          dialogTitle: 'Export Habit Data',
        });
      } else {
        Alert.alert('Success', `Data exported to ${filename}`);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Error', 'Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const showPremiumAlert = () => {
    Alert.alert(
      '🌟 Premium Feature',
      'This feature is available with Premium subscription. Upgrade now to unlock all features!',
      [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Upgrade', onPress: () => navigation.navigate('Payment') }
      ]
    );
  };

  const navigateToFeature = (feature) => {
    if (!isPremium && feature.requiresPremium) {
      showPremiumAlert();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(feature.screen, feature.params);
  };

  const premiumFeatures = [
    {
      id: 'challenges',
      icon: 'trophy',
      title: 'Habit Challenges',
      description: 'Take on 7-90 day challenges to build habits faster',
      color: '#FFD700',
      requiresPremium: true,
      screen: 'Challenges',
    },
    {
      id: 'social',
      icon: 'people',
      title: 'Social & Leaderboards',
      description: 'Compete with friends and climb the leaderboard',
      color: '#4ECDC4',
      requiresPremium: true,
      screen: 'Social',
    },
    {
      id: 'achievements',
      icon: 'medal',
      title: 'Achievements & Badges',
      description: 'Unlock achievements and earn points as you progress',
      color: '#9C27B0',
      requiresPremium: true,
      screen: 'Achievements',
    },
    {
      id: 'ai-coaching',
      icon: 'bulb',
      title: 'AI Coaching',
      description: 'Get personalized insights and smart recommendations',
      color: '#FF6B6B',
      requiresPremium: true,
      screen: 'AICoach',
    },
    {
      id: 'analytics',
      icon: 'analytics',
      title: 'Advanced Analytics',
      description: 'Detailed insights, trends, and predictions for your habits',
      color: '#FF9800',
      requiresPremium: true,
      screen: 'Habits',
      action: () => {
        Alert.alert(
          'Advanced Analytics',
          'Select a habit from the Habits screen, then tap on it to view advanced analytics.',
          [{ text: 'OK' }]
        );
      }
    },
    {
      id: 'integrations',
      icon: 'link',
      title: 'Smart Integrations',
      description: 'Sync with Google Calendar, Apple Health, Fitbit & more',
      color: '#2196F3',
      requiresPremium: true,
    },
    {
      id: 'categories',
      icon: 'file-tray-stacked',
      title: 'Habit Categories',
      description: 'Organize your habits by custom categories',
      color: '#95E1D3',
      requiresPremium: true,
    },
    {
      id: 'templates',
      icon: 'library',
      title: 'Premium Templates',
      description: 'Access exclusive habit templates and recommendations',
      color: '#AA96DA',
      requiresPremium: true,
    },
    {
      id: 'photos',
      icon: 'camera',
      title: 'Progress Photos',
      description: 'Track visual progress with before/after photos',
      color: '#FCBAD3',
      requiresPremium: true,
    },
    {
      id: 'export',
      icon: 'download',
      title: 'Data Export',
      description: 'Export your habit data in JSON or CSV format',
      color: '#FFD93D',
      requiresPremium: true,
      action: () => {
        Alert.alert(
          'Export Data',
          'Choose export format:',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'JSON', onPress: () => handleExportData('json') },
            { text: 'CSV', onPress: () => handleExportData('csv') },
          ]
        );
      }
    },
    {
      id: 'unlimited',
      icon: 'infinite',
      title: 'Unlimited Habits',
      description: 'Create as many habits as you need (Free: 5 limit)',
      color: '#6BCF7F',
      requiresPremium: true,
    },
    {
      id: 'reminders',
      icon: 'notifications',
      title: 'Smart Reminders',
      description: 'AI-powered optimal timing for your reminders',
      color: '#F3A683',
      requiresPremium: true,
    },
    {
      id: 'dependencies',
      icon: 'git-branch',
      title: 'Habit Dependencies',
      description: 'Chain habits together with smart dependencies',
      color: '#607D8B',
      requiresPremium: true,
    },
  ];

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
        {/* Subscription Status */}
        <View style={[
          styles.statusCard,
          { backgroundColor: isPremium ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)' }
        ]}>
          <View style={styles.statusHeader}>
            <Ionicons 
              name={isPremium ? 'star' : 'star-outline'} 
              size={32} 
              color={isPremium ? '#FFD700' : theme.colors.textSecondary} 
            />
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>
                {isPremium ? '🌟 Premium Member' : 'Free Plan'}
              </Text>
              {subscriptionInfo && (
                <Text style={styles.statusSubtitle}>
                  {isPremium 
                    ? `${subscriptionInfo.subscription_tier} • Active`
                    : 'Upgrade to unlock all features'
                  }
                </Text>
              )}
            </View>
          </View>
          {!isPremium && (
            <TouchableOpacity 
              style={styles.upgradeButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.navigate('Payment');
              }}
            >
              <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Features Grid */}
        <Text style={styles.sectionTitle}>Premium Features</Text>
        {premiumFeatures.map((feature) => (
          <TouchableOpacity
            key={feature.id}
            style={[
              styles.featureCard,
              !isPremium && feature.requiresPremium && styles.lockedFeature
            ]}
            onPress={() => {
              if (feature.action) {
                if (!isPremium && feature.requiresPremium) {
                  showPremiumAlert();
                } else {
                  feature.action();
                }
              } else if (feature.screen) {
                navigateToFeature(feature);
              }
            }}
          >
            <View style={[styles.featureIconContainer, { backgroundColor: feature.color + '20' }]}>
              <Ionicons name={feature.icon} size={32} color={feature.color} />
              {!isPremium && feature.requiresPremium && (
                <View style={styles.lockBadge}>
                  <Ionicons name="lock-closed" size={12} color="#FFFFFF" />
                </View>
              )}
            </View>
            <View style={styles.featureContent}>
              <View style={styles.featureTitleRow}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                {!isPremium && feature.requiresPremium && (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="star" size={12} color="#FFD700" />
                    <Text style={styles.premiumBadgeText}>PRO</Text>
                  </View>
                )}
              </View>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        ))}

        {/* Benefits Section */}
        {!isPremium && (
          <View style={styles.benefitsContainer}>
            <Text style={styles.sectionTitle}>Why Upgrade?</Text>
            <BenefitItem 
              icon="trophy" 
              text="Join challenges and compete with friends" 
              theme={theme} 
            />
            <BenefitItem 
              icon="medal" 
              text="Unlock achievements and earn rewards" 
              theme={theme} 
            />
            <BenefitItem 
              icon="people" 
              text="Social features and leaderboards" 
              theme={theme} 
            />
            <BenefitItem 
              icon="bulb" 
              text="AI-powered coaching and insights" 
              theme={theme} 
            />
            <BenefitItem 
              icon="infinite" 
              text="Unlimited habits - no restrictions" 
              theme={theme} 
            />
            <BenefitItem 
              icon="analytics" 
              text="Advanced analytics and predictions" 
              theme={theme} 
            />
            <BenefitItem 
              icon="color-palette" 
              text="Personalize with custom themes" 
              theme={theme} 
            />
            <BenefitItem 
              icon="download" 
              text="Export your data anytime" 
              theme={theme} 
            />
            <BenefitItem 
              icon="camera" 
              text="Track progress with photos" 
              theme={theme} 
            />
            <BenefitItem 
              icon="link" 
              text="Integrate with your favorite apps" 
              theme={theme} 
            />
            <BenefitItem 
              icon="headset" 
              text="Priority support" 
              theme={theme} 
            />
            
            <TouchableOpacity 
              style={styles.ctaButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.navigate('Payment');
              }}
            >
              <Ionicons name="star" size={24} color="#FFFFFF" />
              <Text style={styles.ctaButtonText}>Start Premium Today</Text>
            </TouchableOpacity>
          </View>
        )}

        {exporting && (
          <View style={styles.exportingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.exportingText}>Exporting your data...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const BenefitItem = ({ icon, text, theme }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10 }}>
    <View style={{ 
      width: 40, 
      height: 40, 
      borderRadius: 20, 
      backgroundColor: theme.colors.primary + '20',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Ionicons name={icon} size={20} color={theme.colors.primary} />
    </View>
    <Text style={{ 
      marginLeft: 15, 
      fontSize: 16, 
      color: theme.colors.text,
      flex: 1
    }}>
      {text}
    </Text>
    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
  </View>
);

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: spacing.md,
  },
  statusCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...getShadowStyle(theme, 'default'),
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  statusTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: theme.colors.text,
  },
  statusSubtitle: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
  },
  upgradeButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...getShadowStyle(theme, 'default'),
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: theme.colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
    ...getShadowStyle(theme, 'small'),
  },
  lockedFeature: {
    opacity: 0.7,
  },
  featureIconContainer: {
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
  featureContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  featureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureTitle: {
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
  featureDescription: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
  },
  benefitsContainer: {
    marginTop: spacing.lg,
    backgroundColor: theme.colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...getShadowStyle(theme, 'default'),
  },
  ctaButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    ...getShadowStyle(theme, 'large'),
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginLeft: spacing.sm,
  },
  exportingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
  },
  exportingText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    marginTop: spacing.md,
  },
});
