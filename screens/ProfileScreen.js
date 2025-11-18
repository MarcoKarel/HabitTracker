import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Alert,
  ScrollView,
  Image,
  Switch,
  Modal,
  Animated,
  Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, spacing, borderRadius, fontSize, fontWeight, getShadowStyle, responsive } from '../constants/Theme';
import { auth, userProfiles, habits, subscriptionTable, storage, habitCompletions } from '../services/supabaseService';
import { AnimatedPressable } from '../ui/animations';

export default function ProfileScreen({ navigation }) {
  const theme = useTheme();
  const { colorMode, setColorMode } = theme;
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    profileImage: null,
    id: null,
  });
  const [settings, setSettings] = useState({
    darkMode: false,
    notifications: true,
    soundEnabled: true,
    hapticFeedback: true,
    weeklyReports: true,
    reminderFrequency: 'daily',
    biometricEnabled: false
  });
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tempProfile, setTempProfile] = useState({ ...profile });
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(300));
  const [scaleAnim] = useState(new Animated.Value(0.9));
  const [buttonScale] = useState(new Animated.Value(1));

  useEffect(() => {
    fetchProfileData();
    loadSettings();
    checkBiometricAvailability();
    // Initial animation
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
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [stats, setStats] = useState({ habitsCount: 0, completionsCount: 0, currentStreak: 0 });
  const [subscription, setSubscription] = useState({ plan: 'free', active: false, tier: '', status: '', endsAt: null });

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await auth.getCurrentUser();
      if (!user) {
        setLoading(false);
        return;
      }
      // Get profile and map DB avatar_url -> profileImage for UI
      const { data: userProfile } = await userProfiles.get(user.id);
      setProfile({
        username: userProfile?.username || '',
        email: userProfile?.email || '',
        profileImage: userProfile?.avatar_url || null,
        id: user.id,
      });
      // keep tempProfile in sync so edit form shows current values
      setTempProfile({
        username: userProfile?.username || '',
        email: userProfile?.email || '',
        profileImage: userProfile?.avatar_url || null,
        id: user.id,
      });
      // tempProfile already synced above (use DB's avatar_url mapping)
      // Get habit count
      const { data: habitCount } = await habits.getHabitCount(user.id);
      // Compute current streak from completions (timezone-aware)
      const { data: completionsData } = await habitCompletions.getAll(user.id);
      let currentStreak = 0;
      try {
        if (completionsData && completionsData.length > 0) {
          // Build a set of completion dates in ISO date format (YYYY-MM-DD)
          const dateSet = new Set(
            completionsData
              .map(c => {
                if (!c || c.date == null) return null;
                // If the value is already a string like 'YYYY-MM-DD', use it directly
                if (typeof c.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.date)) return c.date;
                // Otherwise normalize via UTC to avoid local timezone shifts
                const d = new Date(c.date);
                return d.toISOString().slice(0,10);
              })
              .filter(Boolean)
          );

          // Start from today (use UTC date string to match DB date values) and walk backwards
          const now = new Date();
          let cursor = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
          while (true) {
            const key = cursor.toISOString().slice(0,10);
            if (dateSet.has(key)) {
              currentStreak += 1;
              // move cursor back one day in UTC
              cursor.setUTCDate(cursor.getUTCDate() - 1);
            } else {
              break;
            }
          }
        }
      } catch (e) {
        currentStreak = 0;
      }
      // Get subscription records (prefer subscriptions table)
      const { data: subsRows, error: subsErr } = await subscriptionTable.getByUser(user.id);
      // Also fetch profile-based subscription fields as a fallback/source for endsAt
      const { data: subInfo } = await userProfiles.getSubscriptionInfo(user.id);

      setStats((prev) => ({ ...prev, habitsCount: habitCount || 0, currentStreak: currentStreak || 0 }));

      if (subsErr) {
        // If subscriptions table failed, fallback to profile fields
        setSubscription({
          plan: subInfo?.subscription_tier || 'free',
          active: subInfo?.subscription_status === 'active',
          tier: subInfo?.subscription_tier || 'free',
          status: subInfo?.subscription_status || 'inactive',
          endsAt: subInfo?.subscription_ends_at || null,
          isPremium: subInfo?.is_premium || false,
        });
      } else if (subsRows && subsRows.length > 0) {
        // subscriptions.getByUser orders by created_at desc, take latest
        const latest = subsRows[0];
        setSubscription({
          plan: latest.plan || subInfo?.subscription_tier || 'free',
          active: (latest.status || subInfo?.subscription_status) === 'active',
          tier: latest.plan || subInfo?.subscription_tier || 'free',
          status: latest.status || subInfo?.subscription_status || 'inactive',
          endsAt: subInfo?.subscription_ends_at || null,
          isPremium: subInfo?.is_premium || (latest.plan && latest.plan !== 'free') || false,
        });
      } else {
        // No subscription rows, use profile fields
        setSubscription({
          plan: subInfo?.subscription_tier || 'free',
          active: subInfo?.subscription_status === 'active',
          tier: subInfo?.subscription_tier || 'free',
          status: subInfo?.subscription_status || 'inactive',
          endsAt: subInfo?.subscription_ends_at || null,
          isPremium: subInfo?.is_premium || false,
        });
      }
    } catch (e) {
      // fallback to local if error
      loadProfile();
    } finally {
      setLoading(false);
    }
  };

  // Header theme toggle (system -> dark -> light)
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

  const loadProfile = async () => {
    try {
      const storedProfile = await AsyncStorage.getItem('userProfile');
      if (storedProfile) {
        const profileData = JSON.parse(storedProfile);
        setProfile(profileData);
        setTempProfile(profileData);
      } else {
        // Default profile (no example/demo credentials)
        const defaultProfile = {
          username: '',
          email: '',
          profileImage: null
        };
        setProfile(defaultProfile);
        setTempProfile(defaultProfile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem('userSettings');
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        
        // Check if biometric is enabled
        const biometricEnabled = await SecureStore.getItemAsync('biometric_enabled');
        parsedSettings.biometricEnabled = biometricEnabled === 'true';
        
        setSettings(parsedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const checkBiometricAvailability = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hasHardware && isEnrolled);
    } catch (error) {
      console.log('Error checking biometric:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('userSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const animateButton = (callback) => {
    if (settings.hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start(() => {
      if (callback) callback();
    });
  };

  const saveProfile = async () => {
    animateButton(async () => {
      try {
        setSavingProfile(true);
        // If we have an authenticated user id, try to upload any local profile image first
        if (tempProfile?.id) {
          let imageUrl = tempProfile.profileImage;

          // detect local uri (file:// or content:// or blob uri) and upload to Supabase storage
          if (imageUrl && (imageUrl.startsWith('file:') || imageUrl.startsWith('content:') || imageUrl.startsWith('blob:') || !imageUrl.startsWith('http')) ) {
            try {
              const fileName = `${Date.now()}.jpg`;
              const { data: uploadData, error: uploadError } = await storage.uploadProfileImage(tempProfile.id, imageUrl, fileName);
              if (uploadError) {
                console.warn('Failed to upload profile image:', uploadError);
              } else if (uploadData?.publicUrl) {
                imageUrl = uploadData.publicUrl;
                // update tempProfile so UI and DB use the public URL
                setTempProfile(prev => ({ ...prev, profileImage: imageUrl }));
              }
            } catch (err) {
              console.warn('Profile image upload error:', err);
            }
          }

          const upsertPayload = {
            id: tempProfile.id,
            username: tempProfile.username,
            email: tempProfile.email,
            avatar_url: imageUrl,
          };

          const { data: upserted, error: upsertErr } = await userProfiles.upsert(upsertPayload);
          if (upsertErr) {
            console.warn('Failed to upsert profile to Supabase, falling back to local:', upsertErr);
            // fallback to local storage
            await AsyncStorage.setItem('userProfile', JSON.stringify(tempProfile));
            setProfile(tempProfile);
          } else {
            // use returned row (single)
            // Map avatar_url returned by DB back to profileImage for local state
            const mapped = upserted ? { ...upserted, profileImage: upserted.avatar_url || imageUrl } : { ...tempProfile, profileImage: imageUrl };
            setProfile(mapped);
            await AsyncStorage.setItem('userProfile', JSON.stringify(mapped));
          }
        } else {
          // No user id — save locally only
          await AsyncStorage.setItem('userProfile', JSON.stringify(tempProfile));
          setProfile(tempProfile);
        }

        setEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
      } catch (error) {
        console.error('Error saving profile:', error);
        Alert.alert('Error', 'Failed to save profile');
      } finally {
        setSavingProfile(false);
      }
    });
  };

  const cancelEdit = () => {
    animateButton(() => {
      setTempProfile({ ...profile });
      setEditing(false);
    });
  };

  const pickImage = async () => {
    animateButton(async () => {
      try {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (permissionResult.granted === false) {
          Alert.alert('Permission Required', 'Permission to access camera roll is required!');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (!result.canceled) {
          setTempProfile(prev => ({ ...prev, profileImage: result.assets[0].uri }));
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to pick image');
      }
    });
  };

  const takePhoto = async () => {
    animateButton(async () => {
      try {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        
        if (permissionResult.granted === false) {
          Alert.alert('Permission Required', 'Permission to access camera is required!');
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (!result.canceled) {
          setTempProfile(prev => ({ ...prev, profileImage: result.assets[0].uri }));
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to take photo');
      }
    });
  };

  const showImageOptions = () => {
    if (settings.hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    Alert.alert(
      'Profile Picture',
      'Choose an option',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Photo Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleLogout = () => {
    if (settings.hapticFeedback) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        }
      ]
    );
  };

  const toggleSetting = async (key, value) => {
    if (settings.hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Handle biometric toggle specially
    if (key === 'biometricEnabled') {
      if (value) {
        // User wants to enable biometric
        Alert.alert(
          'Enable Biometric Login',
          'You need to sign in again to enable biometric authentication. This will securely store your credentials.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Sign In',
              onPress: () => {
                // User needs to log out and log back in
                Alert.alert(
                  'Please Log Out First',
                  'To enable biometric login, please log out and sign in again.',
                  [
                    { text: 'OK' }
                  ]
                );
              }
            }
          ]
        );
      } else {
        // User wants to disable biometric
        Alert.alert(
          'Disable Biometric Login',
          'Are you sure you want to disable biometric authentication?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Disable',
              style: 'destructive',
              onPress: async () => {
                try {
                  await SecureStore.deleteItemAsync('biometric_email');
                  await SecureStore.deleteItemAsync('biometric_password');
                  await SecureStore.deleteItemAsync('biometric_enabled');
                  const newSettings = { ...settings, biometricEnabled: false };
                  saveSettings(newSettings);
                  Alert.alert('Success', 'Biometric login disabled');
                } catch (error) {
                  Alert.alert('Error', 'Failed to disable biometric login');
                }
              }
            }
          ]
        );
      }
      return;
    }
    
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const openSettingsModal = () => {
    animateButton(() => {
      setSettingsModalVisible(true);
    });
  };

  const openAboutModal = () => {
    animateButton(() => {
      setAboutModalVisible(true);
    });
  };

  const openHelpModal = () => {
    animateButton(() => {
      setHelpModalVisible(true);
    });
  };

  const renderProfileImage = () => {
    if (tempProfile.profileImage) {
      return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Image source={{ uri: tempProfile.profileImage }} style={styles.profileImage} />
        </Animated.View>
      );
    }
    return (
      <Animated.View style={[styles.defaultProfileImage, { transform: [{ scale: scaleAnim }] }]}>
        <Ionicons name="person" size={60} color="#666" />
      </Animated.View>
    );
  };

  const getStatistics = async () => {
    try {
      const habits = await AsyncStorage.getItem('habits');
      const completions = await AsyncStorage.getItem('completions');
      
      const habitsCount = habits ? JSON.parse(habits).length : 0;
      const completionsCount = completions ? JSON.parse(completions).length : 0;
      
      return { habitsCount, completionsCount };
    } catch (error) {
      return { habitsCount: 0, completionsCount: 0 };
    }
  };



  const saveSubscription = async (sub) => {
    try {
      await AsyncStorage.setItem('subscription', JSON.stringify(sub));
      setSubscription(sub);
    } catch (err) {
      console.error('Failed to save subscription', err);
    }
  };

  const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

  const styles = createStyles(theme);


  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <Text style={{ color: theme.colors.text, fontSize: 18 }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <Animated.ScrollView 
      style={[styles.container, { opacity: fadeAnim }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={[styles.header, { transform: [{ translateY: slideAnim }] }]}> 
        <View style={styles.profileImageContainer}>
          {renderProfileImage()}
          {editing && (
            <AnimatedTouchableOpacity 
              style={[styles.cameraIcon, { transform: [{ scale: buttonScale }] }]} 
              onPress={showImageOptions}
            >
              <Ionicons name="camera" size={20} color="white" />
            </AnimatedTouchableOpacity>
          )}
        </View>
        <View style={styles.userInfo}>
          {editing ? (
            <>
              <TextInput
                style={styles.usernameInput}
                value={tempProfile.username}
                onChangeText={(text) => setTempProfile(prev => ({ ...prev, username: text }))}
                placeholder="Username"
              />
              <TextInput
                style={styles.emailInput}
                value={tempProfile.email}
                onChangeText={(text) => setTempProfile(prev => ({ ...prev, email: text }))}
                placeholder="Email"
                keyboardType="email-address"
              />
            </>
          ) : (
            <>
              <Text style={[styles.username, { fontSize: fontSize.xxl }]}>{profile.username || 'No username'}</Text>
              <Text style={styles.email}>{profile.email}</Text>
            </>
          )}
        </View>
        <View style={styles.actionButtons}>
          {editing ? (
            <View style={styles.editActions}>
              <AnimatedTouchableOpacity 
                style={[styles.cancelButton, { transform: [{ scale: buttonScale }] }]} 
                onPress={cancelEdit}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </AnimatedTouchableOpacity>
              <AnimatedTouchableOpacity 
                style={[styles.saveButton, { transform: [{ scale: buttonScale }] }]} 
                onPress={saveProfile}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </AnimatedTouchableOpacity>
            </View>
          ) : (
            <AnimatedTouchableOpacity 
              style={[styles.editButton, { transform: [{ scale: buttonScale }] }]} 
              onPress={() => animateButton(() => setEditing(true))}
            >
              <Ionicons name="pencil" size={16} color="white" />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </AnimatedTouchableOpacity>
          )}
        </View>
      </Animated.View>

      <Animated.View style={[styles.statsSection, { transform: [{ translateY: slideAnim }] }]}> 
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsGrid}>
          <Animated.View style={[styles.statCard, { transform: [{ scale: scaleAnim }] }]}> 
            <Text style={styles.statNumber}>{stats.habitsCount}</Text>
            <Text style={styles.statLabel}>Total Habits</Text>
          </Animated.View>

          <Animated.View style={[styles.statCard, { transform: [{ scale: scaleAnim }] }]}> 
            <Text style={styles.statNumber}>{stats.currentStreak}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </Animated.View>
        </View>
      </Animated.View>

      <Animated.View style={[styles.subscriptionSection, { transform: [{ translateY: slideAnim }] }]}> 
        <Text style={styles.sectionTitle}>Subscription</Text>
        <View style={styles.subscriptionCard}>
          <Text style={[styles.subscriptionPlan, subscription.isPremium ? { color: '#FFD700' } : {}]}>
            {subscription.tier ? subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1) : 'Free'}
          </Text>
          <Text style={styles.subscriptionStatus}>{subscription.status ? subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1) : 'Inactive'}</Text>
          {subscription.endsAt && (
            <Text style={[styles.subscriptionStatus, { fontSize: 12 }]}>Ends: {new Date(subscription.endsAt).toLocaleDateString()}</Text>
          )}
          <AnimatedPressable
            style={styles.manageButton}
            onPress={() => {
              animateButton(() => navigation.navigate('Payment'));
            }}
          >
            <Text style={styles.manageButtonText}>Manage Subscription</Text>
          </AnimatedPressable>
        </View>
      </Animated.View>

      <Animated.View style={[styles.optionsSection, { transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <AnimatedTouchableOpacity 
          style={[styles.option, { transform: [{ scale: buttonScale }] }]}
          onPress={openSettingsModal}
        >
          <Ionicons name="settings-outline" size={24} color={theme.colors.primary} />
          <Text style={styles.optionText}>Preferences</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
        </AnimatedTouchableOpacity>

        <AnimatedTouchableOpacity 
          style={[styles.option, { transform: [{ scale: buttonScale }] }]}
          onPress={() => animateButton(() => {})}
        >
          <Ionicons name="notifications-outline" size={24} color={theme.colors.primary} />
          <Text style={styles.optionText}>Notifications</Text>
          <Switch
            value={settings.notifications}
            onValueChange={(value) => toggleSetting('notifications', value)}
            trackColor={{ false: theme.colors.cardBorder || '#767577', true: theme.colors.primary }}
            thumbColor={settings.notifications ? '#fff' : '#f4f3f4'}
          />
        </AnimatedTouchableOpacity>

        <AnimatedTouchableOpacity 
          style={[styles.option, { transform: [{ scale: buttonScale }] }]}
          onPress={openHelpModal}
        >
          <Ionicons name="help-circle-outline" size={24} color={theme.colors.primary} />
          <Text style={styles.optionText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
        </AnimatedTouchableOpacity>

        <AnimatedTouchableOpacity 
          style={[styles.option, { transform: [{ scale: buttonScale }] }]}
          onPress={openAboutModal}
        >
          <Ionicons name="information-circle-outline" size={24} color={theme.colors.primary} />
          <Text style={styles.optionText}>About</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
        </AnimatedTouchableOpacity>
      </Animated.View>

      <AnimatedTouchableOpacity 
        style={[styles.logoutButton, { transform: [{ scale: buttonScale }] }]} 
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
        <Text style={styles.logoutText}>Logout</Text>
      </AnimatedTouchableOpacity>

      {/* Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={settingsModalVisible}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Animated.View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Preferences</Text>
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Dark Mode</Text>
              <Switch
                value={settings.darkMode}
                onValueChange={(value) => toggleSetting('darkMode', value)}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={settings.darkMode ? '#fff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Sound Effects</Text>
              <Switch
                value={settings.soundEnabled}
                onValueChange={(value) => toggleSetting('soundEnabled', value)}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={settings.soundEnabled ? '#fff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Haptic Feedback</Text>
              <Switch
                value={settings.hapticFeedback}
                onValueChange={(value) => toggleSetting('hapticFeedback', value)}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={settings.hapticFeedback ? '#fff' : '#f4f3f4'}
              />
            </View>

            {biometricAvailable && (
              <View style={styles.settingItem}>
                <View style={styles.settingLabelContainer}>
                  <Ionicons name="finger-print" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.settingLabel}>Biometric Login</Text>
                </View>
                <Switch
                  value={settings.biometricEnabled}
                  onValueChange={(value) => toggleSetting('biometricEnabled', value)}
                  trackColor={{ false: theme.colors.cardBorder || '#767577', true: theme.colors.primary }}
                  thumbColor={settings.biometricEnabled ? '#fff' : '#f4f3f4'}
                />
              </View>
            )}

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Weekly Reports</Text>
              <Switch
                value={settings.weeklyReports}
                onValueChange={(value) => toggleSetting('weeklyReports', value)}
                trackColor={{ false: theme.colors.cardBorder || '#767577', true: theme.colors.primary }}
                thumbColor={settings.weeklyReports ? '#fff' : '#f4f3f4'}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* About Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={aboutModalVisible}
        onRequestClose={() => setAboutModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Animated.View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>About Habit Tracker</Text>
              <TouchableOpacity onPress={() => setAboutModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.aboutContent}>
              <View style={styles.appIcon}>
                <Ionicons name="checkmark-circle" size={64} color="#007AFF" />
              </View>
              <Text style={styles.appName}>Habit Tracker</Text>
              <Text style={styles.version}>Version 1.0.0</Text>
              <Text style={styles.description}>
                Build better habits, track your progress, and achieve your goals with our intuitive habit tracking app.
              </Text>
              <Text style={styles.developer}>Developed with ❤️ by Your Team</Text>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Help Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={helpModalVisible}
        onRequestClose={() => setHelpModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Animated.View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Help & Support</Text>
              <TouchableOpacity onPress={() => setHelpModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.helpContent}>
              <View style={styles.helpSection}>
                <Text style={styles.helpSectionTitle}>🎯 Getting Started</Text>
                <Text style={styles.helpText}>
                  • Add habits you want to track daily{'\n'}
                  • Set custom reminder times{'\n'}
                  • Mark habits as complete each day{'\n'}
                  • View your progress in the Statistics tab
                </Text>
              </View>

              <View style={styles.helpSection}>
                <Text style={styles.helpSectionTitle}>🔔 Notifications</Text>
                <Text style={styles.helpText}>
                  • Tap the bell icon on any habit{'\n'}
                  • Choose your reminder time{'\n'}
                  • Select which days to receive reminders{'\n'}
                  • Toggle notifications in Settings
                </Text>
              </View>

              <View style={styles.helpSection}>
                <Text style={styles.helpSectionTitle}>📊 Heat Map</Text>
                <Text style={styles.helpText}>
                  • View your habit completion patterns{'\n'}
                  • Green squares indicate completed days{'\n'}
                  • Track streaks and consistency{'\n'}
                  • Use data to improve your habits
                </Text>
              </View>

              <View style={styles.helpSection}>
                <Text style={styles.helpSectionTitle}>💬 Contact Support</Text>
                <Text style={styles.helpText}>
                  Need more help? Reach out to us:{'\n'}
                  📧 support@habittracker.com{'\n'}
                  🌐 www.habittracker.com/help
                </Text>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </Animated.ScrollView>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      backgroundColor: theme.colors.card,
      padding: spacing.lg,
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.cardBorder,
    },
    profileImageContainer: {
      position: 'relative',
      marginBottom: spacing.md,
    },
    profileImage: {
      width: responsive.moderateScale(96),
      height: responsive.moderateScale(96),
      borderRadius: responsive.moderateScale(48),
      borderWidth: 3,
      borderColor: theme.colors.primary,
    },
    defaultProfileImage: {
      width: responsive.moderateScale(96),
      height: responsive.moderateScale(96),
      borderRadius: responsive.moderateScale(48),
      backgroundColor: theme.colors.muted,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: theme.colors.primary,
    },
    cameraIcon: {
      position: 'absolute',
      bottom: responsive.moderateScale(6),
      right: responsive.moderateScale(6),
      backgroundColor: theme.colors.primary,
      borderRadius: responsive.moderateScale(14),
      width: responsive.moderateScale(28),
      height: responsive.moderateScale(28),
      alignItems: 'center',
      justifyContent: 'center',
      ...getShadowStyle(theme, 5),
    },
    userInfo: {
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    username: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: theme.colors.text,
      marginBottom: 4,
    },
    email: {
      fontSize: fontSize.md,
      color: theme.colors.textSecondary,
    },
    usernameInput: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: theme.colors.text,
      borderBottomWidth: 2,
      borderBottomColor: theme.colors.primary,
      textAlign: 'center',
      minWidth: 200,
      marginBottom: spacing.xs,
      paddingVertical: 4,
    },
    emailInput: {
      fontSize: fontSize.md,
      color: theme.colors.textSecondary,
      borderBottomWidth: 2,
      borderBottomColor: theme.colors.primary,
      textAlign: 'center',
      minWidth: 200,
      paddingVertical: 4,
    },
    actionButtons: {
      alignItems: 'center',
    },
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
      ...getShadowStyle(theme, 5),
    },
    editButtonText: {
      color: '#FFFFFF',
      marginLeft: 6,
      fontWeight: fontWeight.semibold,
      fontSize: fontSize.md,
    },
    editActions: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    cancelButton: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
    },
    cancelButtonText: {
      color: theme.colors.text,
      fontWeight: fontWeight.semibold,
      fontSize: fontSize.md,
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
      ...getShadowStyle(theme, 5),
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontWeight: fontWeight.semibold,
      fontSize: fontSize.md,
    },
    statsSection: {
      backgroundColor: theme.colors.card,
      margin: spacing.md,
      padding: spacing.lg,
      borderRadius: borderRadius.lg,
      ...getShadowStyle(theme, 3),
    },
    sectionTitle: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      marginBottom: spacing.md,
      color: theme.colors.text,
    },
    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    statCard: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      padding: spacing.lg,
      borderRadius: borderRadius.md,
      minWidth: responsive.scale(110),
    },
    statNumber: {
      fontSize: responsive.moderateScale(26),
      fontWeight: fontWeight.bold,
      color: theme.colors.primary,
    },
    statLabel: {
      fontSize: fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: 4,
      fontWeight: fontWeight.medium,
    },
    subscriptionSection: {
      backgroundColor: theme.colors.card,
      margin: spacing.md,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      ...getShadowStyle(theme, 2),
    },
    subscriptionCard: {
      backgroundColor: theme.colors.surface,
      padding: spacing.md,
      borderRadius: borderRadius.sm,
      alignItems: 'center',
    },
    subscriptionPlan: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: theme.colors.primary,
    },
    subscriptionStatus: {
      marginTop: 6,
      fontSize: fontSize.sm,
      color: theme.colors.textSecondary,
    },
    manageButton: {
      marginTop: spacing.md,
      backgroundColor: theme.colors.primary,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.lg,
    },
    manageButtonText: {
      color: '#FFFFFF',
      fontWeight: fontWeight.bold,
    },
    optionsSection: {
      backgroundColor: theme.colors.card,
      margin: spacing.md,
      marginTop: 0,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      overflow: 'hidden',
      ...getShadowStyle(theme, 3),
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 0,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.cardBorder,
    },
    optionText: {
      flex: 1,
      fontSize: fontSize.md,
      marginLeft: spacing.md,
      color: theme.colors.text,
      fontWeight: fontWeight.medium,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.card,
      margin: spacing.md,
      marginTop: 0,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 2,
      borderColor: theme.colors.error,
      ...getShadowStyle(theme, 3),
    },
    logoutText: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
      color: theme.colors.error,
      marginLeft: spacing.xs,
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      backgroundColor: theme.colors.card,
      borderRadius: borderRadius.xl,
      width: '90%',
      maxWidth: 400,
      maxHeight: '80%',
      ...getShadowStyle(theme, 10),
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.cardBorder,
    },
    modalTitle: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: theme.colors.text,
    },
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.cardBorder,
    },
    settingLabel: {
      fontSize: fontSize.md,
      color: theme.colors.text,
      fontWeight: fontWeight.medium,
    },
    settingLabelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    aboutContent: {
      padding: spacing.lg,
      alignItems: 'center',
    },
    appIcon: {
      marginBottom: spacing.md,
    },
    appName: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: theme.colors.text,
      marginBottom: 4,
    },
    version: {
      fontSize: fontSize.md,
      color: theme.colors.textSecondary,
      marginBottom: spacing.md,
    },
    description: {
      fontSize: fontSize.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: responsive.moderateScale(24),
      marginBottom: spacing.md,
    },
    developer: {
      fontSize: fontSize.sm,
      color: theme.colors.muted,
      fontStyle: 'italic',
    },
    helpContent: {
      padding: spacing.lg,
    },
    helpSection: {
      marginBottom: spacing.lg,
    },
    helpSectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: theme.colors.text,
      marginBottom: spacing.xs,
    },
    helpText: {
      fontSize: fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
  });
}