import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import * as Haptics from 'expo-haptics';
import { useTheme, spacing, borderRadius, fontSize, fontWeight, getShadowStyle } from '../constants/Theme';
import { auth, habits as habitsService, userProfiles } from '../services/supabaseService';

const screenWidth = Dimensions.get('window').width;

export default function AdvancedAnalyticsScreen({ route, navigation }) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { habitId, habitName } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    initializeUser();
  }, []);

  const initializeUser = async () => {
    try {
      const { data: { user } } = await auth.getCurrentUser();
      if (user) {
        setUserId(user.id);
        await checkPremiumStatus(user.id);
        if (habitId) {
          await loadAnalytics(user.id, habitId);
        }
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
    } catch (error) {
      console.error('Error checking premium status:', error);
    }
  };

  const loadAnalytics = async (uid, hId) => {
    try {
      const { data, error } = await habitsService.getAnalytics(uid, hId);
      
      if (error?.isPremiumFeature) {
        Alert.alert(
          '🌟 Premium Feature',
          'Advanced Analytics is available with Premium subscription. Upgrade to unlock detailed insights about your habits!',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Upgrade', onPress: () => navigation.navigate('Payment') }
          ]
        );
        navigation.goBack();
        return;
      }
      
      if (error) {
        console.error('Error loading analytics:', error);
        Alert.alert('Error', 'Failed to load analytics data');
        return;
      }
      
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const formatPercentage = (value) => {
    return value ? `${parseFloat(value).toFixed(1)}%` : '0%';
  };

  const getConsistencyColor = (score) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FFC107';
    if (score >= 40) return '#FF9800';
    return '#F44336';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!isPremium) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.premiumPrompt}>
          <Ionicons name="analytics" size={80} color={theme.colors.primary} />
          <Text style={styles.premiumTitle}>Advanced Analytics</Text>
          <Text style={styles.premiumText}>
            Unlock detailed insights about your habits with Premium:
          </Text>
          <View style={styles.featureList}>
            <FeatureItem icon="trending-up" text="Completion rate trends" theme={theme} />
            <FeatureItem icon="calendar" text="Best days and times" theme={theme} />
            <FeatureItem icon="speedometer" text="Consistency scores" theme={theme} />
            <FeatureItem icon="flash" text="Success predictions" theme={theme} />
            <FeatureItem icon="stats-chart" text="Detailed statistics" theme={theme} />
            <FeatureItem icon="bulb" text="Personalized insights" theme={theme} />
          </View>
          <TouchableOpacity 
            style={styles.upgradeButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate('Payment');
            }}
          >
            <Ionicons name="star" size={20} color="#FFFFFF" />
            <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDataText}>No analytics data available</Text>
      </View>
    );
  }

  const completionRateData = {
    labels: ['7d', '30d', '90d'],
    datasets: [{
      data: [
        parseFloat(analytics.completion_rate_7d || 0),
        parseFloat(analytics.completion_rate_30d || 0),
        parseFloat(analytics.completion_rate_90d || 0),
      ]
    }]
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Ionicons name="analytics" size={32} color={theme.colors.primary} />
          <Text style={styles.habitName}>{habitName}</Text>
        </View>

        {/* Overview Cards */}
        <View style={styles.cardsRow}>
          <StatCard 
            icon="flame" 
            label="Current Streak" 
            value={analytics.current_streak} 
            color="#FF6B6B"
            theme={theme}
          />
          <StatCard 
            icon="trophy" 
            label="Best Streak" 
            value={analytics.longest_streak} 
            color="#FFD700"
            theme={theme}
          />
        </View>

        <View style={styles.cardsRow}>
          <StatCard 
            icon="checkmark-circle" 
            label="Total" 
            value={analytics.total_completions} 
            color="#4CAF50"
            theme={theme}
          />
          <StatCard 
            icon="speedometer" 
            label="Consistency" 
            value={formatPercentage(analytics.consistency_score)}
            color={getConsistencyColor(analytics.consistency_score)}
            theme={theme}
          />
        </View>

        {/* Completion Rate Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Completion Rate Trends</Text>
          <BarChart
            data={completionRateData}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              backgroundColor: theme.colors.card,
              backgroundGradientFrom: theme.colors.card,
              backgroundGradientTo: theme.colors.card,
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
              labelColor: (opacity = 1) => theme.colors.text,
              style: { borderRadius: 16 },
              propsForBackgroundLines: {
                strokeDasharray: '',
                stroke: theme.colors.border,
                strokeWidth: 1,
              },
            }}
            style={styles.chart}
            showValuesOnTopOfBars
            fromZero
            yAxisSuffix="%"
          />
        </View>

        {/* Insights */}
        <View style={styles.insightsContainer}>
          <Text style={styles.sectionTitle}>📊 Insights</Text>
          
          <InsightCard
            icon="calendar"
            title="Best Day"
            value={analytics.best_day_of_week || 'N/A'}
            theme={theme}
          />
          
          <InsightCard
            icon="time"
            title="Most Productive Hour"
            value={analytics.most_productive_hour ? `${analytics.most_productive_hour}:00` : 'N/A'}
            theme={theme}
          />
          
          <InsightCard
            icon="flash"
            title="Success Prediction"
            value={formatPercentage(analytics.predicted_success_rate)}
            subtitle="Likelihood of completing tomorrow"
            theme={theme}
          />
        </View>

        {/* Recommendations */}
        <View style={styles.recommendationsContainer}>
          <Text style={styles.sectionTitle}>💡 Recommendations</Text>
          
          {parseFloat(analytics.completion_rate_7d) < 50 && (
            <RecommendationCard
              icon="alert-circle"
              text="Your completion rate has dropped. Try setting a reminder or reducing the difficulty."
              theme={theme}
            />
          )}
          
          {parseFloat(analytics.consistency_score) < 60 && (
            <RecommendationCard
              icon="trending-up"
              text="Build consistency by completing this habit at the same time each day."
              theme={theme}
            />
          )}
          
          {analytics.current_streak >= 7 && (
            <RecommendationCard
              icon="trophy"
              text="Great work! You're on a 7+ day streak. Keep it going!"
              theme={theme}
              isPositive
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const FeatureItem = ({ icon, text, theme }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8 }}>
    <Ionicons name={icon} size={24} color={theme.colors.primary} />
    <Text style={{ marginLeft: 12, fontSize: 16, color: theme.colors.text }}>{text}</Text>
  </View>
);

const StatCard = ({ icon, label, value, color, theme }) => (
  <View style={[createStyles(theme).statCard, { borderLeftColor: color }]}>
    <Ionicons name={icon} size={28} color={color} />
    <Text style={createStyles(theme).statValue}>{value}</Text>
    <Text style={createStyles(theme).statLabel}>{label}</Text>
  </View>
);

const InsightCard = ({ icon, title, value, subtitle, theme }) => (
  <View style={createStyles(theme).insightCard}>
    <Ionicons name={icon} size={24} color={theme.colors.primary} />
    <View style={createStyles(theme).insightContent}>
      <Text style={createStyles(theme).insightTitle}>{title}</Text>
      <Text style={createStyles(theme).insightValue}>{value}</Text>
      {subtitle && <Text style={createStyles(theme).insightSubtitle}>{subtitle}</Text>}
    </View>
  </View>
);

const RecommendationCard = ({ icon, text, theme, isPositive }) => (
  <View style={[
    createStyles(theme).recommendationCard, 
    { backgroundColor: isPositive ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)' }
  ]}>
    <Ionicons 
      name={icon} 
      size={24} 
      color={isPositive ? '#4CAF50' : '#FF9800'} 
    />
    <Text style={createStyles(theme).recommendationText}>{text}</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
  },
  habitName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: theme.colors.text,
    marginLeft: spacing.md,
    flex: 1,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
    borderLeftWidth: 4,
    ...getShadowStyle(theme, 'default'),
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: theme.colors.text,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
  },
  chartContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginVertical: spacing.md,
    ...getShadowStyle(theme, 'default'),
  },
  chartTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: spacing.md,
  },
  chart: {
    marginVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  insightsContainer: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: theme.colors.text,
    marginBottom: spacing.md,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
    ...getShadowStyle(theme, 'small'),
  },
  insightContent: {
    marginLeft: spacing.md,
    flex: 1,
  },
  insightTitle: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
  },
  insightValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: theme.colors.text,
    marginTop: spacing.xs,
  },
  insightSubtitle: {
    fontSize: fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
  },
  recommendationsContainer: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  recommendationCard: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  recommendationText: {
    marginLeft: spacing.md,
    fontSize: fontSize.md,
    color: theme.colors.text,
    flex: 1,
  },
  premiumPrompt: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    paddingTop: 80,
  },
  premiumTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: theme.colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  premiumText: {
    fontSize: fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  featureList: {
    width: '100%',
    marginVertical: spacing.lg,
  },
  upgradeButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    marginTop: spacing.lg,
    ...getShadowStyle(theme, 'large'),
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginLeft: spacing.sm,
  },
  noDataText: {
    fontSize: fontSize.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
