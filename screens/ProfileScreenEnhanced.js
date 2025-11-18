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
import { spacing, fontSize, borderRadius, responsive } from '../constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen({ navigation }) {
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
  }, []);

  const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: responsive.moderateScale(20),
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  profileImage: {
    width: responsive.moderateScale(100),
    height: responsive.moderateScale(100),
    borderRadius: responsive.moderateScale(50),
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  defaultProfileImage: {
    width: responsive.moderateScale(100),
    height: responsive.moderateScale(100),
    borderRadius: responsive.moderateScale(50),
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: responsive.moderateScale(5),
    right: responsive.moderateScale(5),
    backgroundColor: '#007AFF',
    borderRadius: responsive.moderateScale(15),
    width: responsive.moderateScale(30),
    height: responsive.moderateScale(30),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  username: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: spacing.xs,
  },
  email: {
    fontSize: fontSize.md,
    color: '#666',
  },
  usernameInput: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: '#333',
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
    textAlign: 'center',
    minWidth: responsive.scale(200),
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
  },
  emailInput: {
    fontSize: fontSize.md,
    color: '#666',
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
    textAlign: 'center',
    minWidth: responsive.scale(200),
    paddingVertical: spacing.xs,
  },
  actionButtons: {
    alignItems: 'center',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  editButtonText: {
    color: 'white',
    marginLeft: spacing.xs,
    fontWeight: '600',
    fontSize: fontSize.md,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: fontSize.md,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: fontSize.md,
  },
  statsSection: {
    backgroundColor: 'white',
    margin: spacing.md,
    padding: responsive.moderateScale(20),
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.md,
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: responsive.moderateScale(20),
    borderRadius: borderRadius.md,
    minWidth: responsive.moderateScale(100),
  },
  statNumber: {
    fontSize: responsive.moderateScale(28),
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: '#666',
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  optionsSection: {
    backgroundColor: 'white',
    margin: spacing.md,
    marginTop: 0,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionText: {
    flex: 1,
    fontSize: fontSize.md,
    marginLeft: spacing.lg,
    color: '#333',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    margin: spacing.md,
    marginTop: 0,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: '#FF3B30',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  logoutText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: spacing.xs,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: responsive.moderateScale(20),
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: responsive.moderateScale(20),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: '#333',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: fontSize.md,
    color: '#333',
    fontWeight: '500',
  },
  aboutContent: {
    padding: responsive.moderateScale(20),
    alignItems: 'center',
  },
  appIcon: {
    marginBottom: spacing.md,
  },
  appName: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: spacing.xs,
  },
  version: {
    fontSize: fontSize.md,
    color: '#666',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: fontSize.md,
    color: '#666',
    textAlign: 'center',
    lineHeight: responsive.moderateScale(24),
    marginBottom: spacing.md,
  },
  developer: {
    fontSize: fontSize.sm,
    color: '#999',
    fontStyle: 'italic',
  },
  helpContent: {
    padding: responsive.moderateScale(20),
  },
  helpSection: {
    marginBottom: responsive.moderateScale(24),
  },
  helpSectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: spacing.sm,
  },
  helpText: {
    fontSize: fontSize.sm,
    color: '#666',
    lineHeight: responsive.moderateScale(20),
  },
});