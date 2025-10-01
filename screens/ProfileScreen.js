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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, spacing, borderRadius, fontSize, fontWeight, getShadowStyle } from '../constants/Theme';

export default function ProfileScreen({ navigation }) {
  const theme = useTheme();
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    profileImage: null
  });
  const [settings, setSettings] = useState({
    darkMode: false,
    notifications: true,
    soundEnabled: true,
    hapticFeedback: true,
    weeklyReports: true,
    reminderFrequency: 'daily'
  });
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
    loadProfile();
    loadSettings();
    
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

  const loadProfile = async () => {
    try {
      const storedProfile = await AsyncStorage.getItem('userProfile');
      if (storedProfile) {
        const profileData = JSON.parse(storedProfile);
        setProfile(profileData);
        setTempProfile(profileData);
      } else {
        // Default profile
        const defaultProfile = {
          username: 'HabitUser',
          email: 'user@example.com',
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
        setSettings(JSON.parse(storedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
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
        await AsyncStorage.setItem('userProfile', JSON.stringify(tempProfile));
        setProfile(tempProfile);
        setEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
      } catch (error) {
        console.error('Error saving profile:', error);
        Alert.alert('Error', 'Failed to save profile');
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

  const toggleSetting = (key, value) => {
    if (settings.hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const [stats, setStats] = useState({ habitsCount: 0, completionsCount: 0 });

  useEffect(() => {
    getStatistics().then(setStats);
    loadSubscription();
  }, []);

  const [subscription, setSubscription] = useState({ plan: 'free', active: false });

  const loadSubscription = async () => {
    try {
      const stored = await AsyncStorage.getItem('subscription');
      if (stored) {
        setSubscription(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load subscription', err);
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
              <Text style={styles.username}>{profile.username}</Text>
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
            <Text style={styles.statNumber}>{stats.completionsCount}</Text>
            <Text style={styles.statLabel}>Completions</Text>
          </Animated.View>
        </View>
      </Animated.View>

      <Animated.View style={[styles.subscriptionSection, { transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.sectionTitle}>Subscription</Text>
        <View style={styles.subscriptionCard}>
          <Text style={styles.subscriptionPlan}>{subscription.plan === 'free' ? 'Free' : subscription.plan === 'personal' ? 'Personal' : 'Enterprise'}</Text>
          <Text style={styles.subscriptionStatus}>{subscription.active ? 'Active' : 'Inactive'}</Text>
          <TouchableOpacity
            style={styles.manageButton}
            onPress={() => {
              animateButton(() => navigation.navigate('Payment'));
            }}
          >
            <Text style={styles.manageButtonText}>Manage Subscription</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.View style={[styles.optionsSection, { transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <AnimatedTouchableOpacity 
          style={[styles.option, { transform: [{ scale: buttonScale }] }]}
          onPress={openSettingsModal}
        >
          <Ionicons name="settings-outline" size={24} color="#007AFF" />
          <Text style={styles.optionText}>Preferences</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </AnimatedTouchableOpacity>

        <AnimatedTouchableOpacity 
          style={[styles.option, { transform: [{ scale: buttonScale }] }]}
          onPress={() => animateButton(() => {})}
        >
          <Ionicons name="notifications-outline" size={24} color="#007AFF" />
          <Text style={styles.optionText}>Notifications</Text>
          <Switch
            value={settings.notifications}
            onValueChange={(value) => toggleSetting('notifications', value)}
            trackColor={{ false: '#767577', true: '#007AFF' }}
            thumbColor={settings.notifications ? '#fff' : '#f4f3f4'}
          />
        </AnimatedTouchableOpacity>

        <AnimatedTouchableOpacity 
          style={[styles.option, { transform: [{ scale: buttonScale }] }]}
          onPress={openHelpModal}
        >
          <Ionicons name="help-circle-outline" size={24} color="#007AFF" />
          <Text style={styles.optionText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </AnimatedTouchableOpacity>

        <AnimatedTouchableOpacity 
          style={[styles.option, { transform: [{ scale: buttonScale }] }]}
          onPress={openAboutModal}
        >
          <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
          <Text style={styles.optionText}>About</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
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

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Weekly Reports</Text>
              <Switch
                value={settings.weeklyReports}
                onValueChange={(value) => toggleSetting('weeklyReports', value)}
                trackColor={{ false: '#767577', true: '#007AFF' }}
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
      borderBottomColor: theme.colors.border,
    },
    profileImageContainer: {
      position: 'relative',
      marginBottom: spacing.md,
    },
    profileImage: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 3,
      borderColor: theme.colors.primary,
    },
    defaultProfileImage: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.colors.muted,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: theme.colors.primary,
    },
    cameraIcon: {
      position: 'absolute',
      bottom: 5,
      right: 5,
      backgroundColor: theme.colors.primary,
      borderRadius: 15,
      width: 30,
      height: 30,
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
      minWidth: 100,
    },
    statNumber: {
      fontSize: 28,
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
      paddingVertical: spacing.xs,
      ...getShadowStyle(theme, 3),
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
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
      borderBottomColor: theme.colors.border,
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
      borderBottomColor: theme.colors.border,
    },
    settingLabel: {
      fontSize: fontSize.md,
      color: theme.colors.text,
      fontWeight: fontWeight.medium,
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
      lineHeight: 24,
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