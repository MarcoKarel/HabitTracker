import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, spacing, borderRadius, fontSize, fontWeight, getShadowStyle } from '../constants/Theme';
import { auth, socialFeatures, userProfiles } from '../services/supabaseService';

export default function SocialScreen({ navigation }) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');

  useEffect(() => {
    initializeUser();
  }, []);

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
      const [friendsRes, requestsRes, leaderboardRes] = await Promise.all([
        socialFeatures.getFriends(uid),
        socialFeatures.getPendingRequests(uid),
        socialFeatures.getLeaderboard(uid, selectedPeriod)
      ]);

      if (friendsRes.data) setFriends(friendsRes.data);
      if (requestsRes.data) setPendingRequests(requestsRes.data);
      if (leaderboardRes.data) setLeaderboard(leaderboardRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      if (error.isPremiumFeature) {
        showPremiumAlert();
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAddFriend = async () => {
    if (!isPremium) {
      showPremiumAlert();
      return;
    }

    if (!friendEmail.trim()) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      const { data, error } = await socialFeatures.sendFriendRequest(userId, friendEmail.trim());
      
      if (error) {
        Alert.alert('Error', error.message || 'Failed to send friend request');
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success!', 'Friend request sent! 🎉');
      setShowAddFriendModal(false);
      setFriendEmail('');
    } catch (error) {
      console.error('Error adding friend:', error);
      Alert.alert('Error', 'Failed to send friend request');
    }
  };

  const handleAcceptRequest = async (connectionId) => {
    try {
      const { error } = await socialFeatures.acceptFriendRequest(connectionId);
      
      if (error) {
        Alert.alert('Error', 'Failed to accept request');
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadData();
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const handleRemoveFriend = (connectionId, friendName) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friendName} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error } = await socialFeatures.removeFriend(connectionId);
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
      'Social features require Premium. Upgrade now to compete with friends!',
      [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Upgrade', onPress: () => navigation.navigate('Payment') }
      ]
    );
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
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.premiumUpsell}>
            <Ionicons name="people" size={64} color={theme.colors.primary} />
            <Text style={styles.upsellTitle}>Connect with Friends!</Text>
            <Text style={styles.upsellDescription}>
              Add friends, compete on leaderboards, and share your progress. Upgrade to Premium to unlock social features!
            </Text>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.navigate('Payment');
              }}
            >
              <Ionicons name="star" size={24} color="#FFFFFF" />
              <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Friend Requests</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingRequests.length}</Text>
              </View>
            </View>
            {pendingRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.userInfo}>
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={24} color={theme.colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.userName}>{request.requester.username}</Text>
                    <Text style={styles.userEmail}>{request.requester.email}</Text>
                  </View>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      handleAcceptRequest(request.id);
                    }}
                  >
                    <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.declineButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      handleRemoveFriend(request.id, request.requester.username);
                    }}
                  >
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Leaderboard */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Leaderboard</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowAddFriendModal(true);
            }}
          >
            <Ionicons name="person-add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {['weekly', 'monthly', 'all_time'].map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedPeriod(period);
                loadData();
              }}
            >
              <Text
                style={[
                  styles.periodText,
                  selectedPeriod === period && styles.periodTextActive
                ]}
              >
                {period.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Leaderboard List */}
        {leaderboard.map((entry, index) => (
          <View
            key={entry.user_id}
            style={[
              styles.leaderboardCard,
              entry.is_current_user && styles.currentUserCard
            ]}
          >
            <View style={styles.rankContainer}>
              {index < 3 ? (
                <Ionicons
                  name="trophy"
                  size={32}
                  color={['#FFD700', '#C0C0C0', '#CD7F32'][index]}
                />
              ) : (
                <Text style={styles.rankText}>#{entry.rank}</Text>
              )}
            </View>

            <View style={styles.userInfo}>
              <View style={[
                styles.avatar,
                entry.is_current_user && styles.currentUserAvatar
              ]}>
                <Ionicons
                  name="person"
                  size={24}
                  color={entry.is_current_user ? '#FFFFFF' : theme.colors.primary}
                />
              </View>
              <View>
                <Text style={[
                  styles.userName,
                  entry.is_current_user && styles.currentUserText
                ]}>
                  {entry.username} {entry.is_current_user ? '(You)' : ''}
                </Text>
                <View style={styles.stats}>
                  <View style={styles.statItem}>
                    <Ionicons name="flame" size={14} color="#FF6B6B" />
                    <Text style={styles.statText}>{entry.streak_count}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                    <Text style={styles.statText}>{entry.habits_completed}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.scoreContainer}>
              <Text style={[
                styles.scoreText,
                entry.is_current_user && styles.currentUserText
              ]}>
                {entry.score}
              </Text>
              <Text style={styles.scoreLabel}>pts</Text>
            </View>
          </View>
        ))}

        {/* Friends List */}
        {friends.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Friends ({friends.length})</Text>
            {friends.map((friend) => (
              <TouchableOpacity
                key={friend.id}
                style={styles.friendCard}
                onLongPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  handleRemoveFriend(friend.id, friend.friend.username);
                }}
              >
                <View style={styles.userInfo}>
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={24} color={theme.colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.userName}>{friend.friend.username}</Text>
                    <Text style={styles.userEmail}>{friend.friend.email}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      {/* Add Friend Modal */}
      <Modal
        visible={showAddFriendModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddFriendModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Friend</Text>
              <TouchableOpacity onPress={() => setShowAddFriendModal(false)}>
                <Ionicons name="close" size={28} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Enter your friend's email address to send them a friend request.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="friend@example.com"
              placeholderTextColor={theme.colors.textSecondary}
              value={friendEmail}
              onChangeText={setFriendEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={styles.sendButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleAddFriend();
              }}
            >
              <Text style={styles.sendButtonText}>Send Request</Text>
            </TouchableOpacity>
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
  premiumUpsell: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  upsellTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: theme.colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  upsellDescription: {
    fontSize: fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  upgradeButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    ...getShadowStyle(2),
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginLeft: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: theme.colors.text,
  },
  badge: {
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.full,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  addButton: {
    padding: spacing.xs,
  },
  requestCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...getShadowStyle(1),
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  currentUserAvatar: {
    backgroundColor: theme.colors.primary,
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: theme.colors.text,
  },
  currentUserText: {
    fontWeight: fontWeight.bold,
  },
  userEmail: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
  },
  requestActions: {
    flexDirection: 'row',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  declineButton: {
    backgroundColor: '#F44336',
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  periodButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  periodText: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: fontWeight.medium,
    textTransform: 'capitalize',
  },
  periodTextActive: {
    color: '#FFFFFF',
    fontWeight: fontWeight.bold,
  },
  leaderboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...getShadowStyle(1),
  },
  currentUserCard: {
    backgroundColor: theme.colors.primary + '20',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  rankContainer: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: theme.colors.text,
  },
  stats: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  statText: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: theme.colors.text,
  },
  scoreLabel: {
    fontSize: fontSize.xs,
    color: theme.colors.textSecondary,
  },
  friendCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...getShadowStyle(1),
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
  modalDescription: {
    fontSize: fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: theme.colors.text,
    marginBottom: spacing.lg,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...getShadowStyle(2),
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});
