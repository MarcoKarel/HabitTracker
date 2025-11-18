import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, borderRadius, fontSize, fontWeight, getShadowStyle } from '../constants/Theme';
import { auth } from '../services/supabaseService';

export default function LoginScreen({ navigation }) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(100));
  const [logoScale] = useState(new Animated.Value(0.8));
  const [buttonScale] = useState(new Animated.Value(1));

  useEffect(() => {
    // Check biometric availability and saved credentials
    checkBiometricAndCredentials();

    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const checkBiometricAndCredentials = async () => {
    try {
      // Check if biometric hardware is available and enrolled
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hasHardware && isEnrolled);

      // Check if credentials are saved
      const savedEmail = await SecureStore.getItemAsync('biometric_email');
      setHasSavedCredentials(!!savedEmail);
    } catch (error) {
      console.log('Error checking biometric availability:', error);
    }
  };

  const saveCredentialsForBiometric = async (email, password) => {
    try {
      await SecureStore.setItemAsync('biometric_email', email);
      await SecureStore.setItemAsync('biometric_password', password);
      await SecureStore.setItemAsync('biometric_enabled', 'true');
      setHasSavedCredentials(true);
    } catch (error) {
      console.log('Error saving credentials:', error);
    }
  };

  const authenticateWithBiometrics = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Check if biometric is available
      if (!biometricAvailable) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('Biometric authentication not available', 'Please ensure biometric authentication is set up on your device');
        return;
      }

      // Check if we have saved credentials
      const savedEmail = await SecureStore.getItemAsync('biometric_email');
      const savedPassword = await SecureStore.getItemAsync('biometric_password');
      
      if (!savedEmail || !savedPassword) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('No saved credentials', 'Please sign in with email and password first to enable biometric login');
        return;
      }

      // Prompt for biometric authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to sign in',
        fallbackLabel: 'Use Password',
        disableDeviceFallback: false,
      });

      if (result.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Success animation
        Animated.sequence([
          Animated.timing(logoScale, {
            toValue: 1.1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(logoScale, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          })
        ]).start();

        // Sign in with saved credentials
        setLoading(true);
        const res = await auth.signIn(savedEmail, savedPassword);
        setLoading(false);

        if (res && res.error) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Error', 'Biometric login failed. Please sign in with email and password.');
          return;
        }

        navigation.navigate('Main');
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.log('Biometric authentication error:', error);
      Alert.alert('Error', 'Biometric authentication failed');
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Button animation
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
    ]).start();

    try {
      const res = await auth.signIn(email.trim(), password);
      setLoading(false);

      if (res && res.error) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', res.error.message || 'Login failed. Please check your credentials.');
        return;
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Ask user if they want to enable biometric login
      if (biometricAvailable && !hasSavedCredentials) {
        Alert.alert(
          'Enable Biometric Login?',
          'Would you like to use biometric authentication (fingerprint/face) for faster login next time?',
          [
            {
              text: 'Not Now',
              style: 'cancel',
              onPress: () => navigation.navigate('Main')
            },
            {
              text: 'Enable',
              onPress: async () => {
                await saveCredentialsForBiometric(email.trim(), password);
                Alert.alert('Success', 'Biometric login enabled! You can now use your fingerprint or face to sign in.');
                navigation.navigate('Main');
              }
            }
          ]
        );
      } else {
        navigation.navigate('Main');
      }
    } catch (error) {
      setLoading(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error?.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Animated.View 
            style={[
              styles.logoContainer,
              {
                transform: [{ scale: logoScale }]
              }
            ]}
          >
            <Ionicons name="checkmark-circle" size={80} color={theme.colors.primary} />
          </Animated.View>
          <Text style={styles.title}>Habit Tracker</Text>
          <Text style={styles.subtitle}>Welcome back! Sign in to continue</Text>
        </Animated.View>

        <Animated.View 
          style={[
            styles.form,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity 
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons 
                name={showPassword ? "eye-outline" : "eye-off-outline"} 
                size={20} 
                color={theme.colors.textSecondary} 
              />
            </TouchableOpacity>
          </View>

          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.buttonDisabled]}
              onPress={handleEmailLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {biometricAvailable && hasSavedCredentials && (
            <TouchableOpacity 
              style={styles.biometricButton}
              onPress={authenticateWithBiometrics}
              activeOpacity={0.8}
            >
              <Ionicons name="finger-print" size={24} color={theme.colors.primary} />
              <Text style={styles.biometricButtonText}>Use Biometric Login</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.registerLink}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('Register');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.registerLinkText}>
              Don't have an account? <Text style={styles.linkText}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoContainer: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: theme.colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBackground,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    ...getShadowStyle(theme, 'small'),
  },
  inputIcon: {
    marginRight: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    paddingVertical: spacing.md,
    color: theme.colors.text,
  },
  eyeIcon: {
    padding: spacing.xs,
  },
  loginButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    ...getShadowStyle(theme, 'default'),
  },
  buttonDisabled: {
    backgroundColor: theme.colors.textTertiary,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.cardBorder,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    color: theme.colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    marginBottom: spacing.sm,
    ...getShadowStyle(theme, 'small'),
  },
  biometricButtonText: {
    color: theme.colors.primary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginLeft: spacing.sm,
  },
  registerLink: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
  },
  registerLinkText: {
    fontSize: fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  linkText: {
    color: theme.colors.primary,
    fontWeight: fontWeight.semibold,
  },
});