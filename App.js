import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, useColorScheme, ActivityIndicator, TouchableOpacity } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { useTheme, ThemeProvider } from './constants/Theme';
import { auth, userProfiles } from './services/supabaseService';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import HabitsScreen from './screens/HabitsScreen';
import ProfileScreen from './screens/ProfileScreen';
import StatisticsScreen from './screens/StatisticsScreen';
import PaymentScreen from './screens/PaymentScreen';
import PremiumFeaturesScreen from './screens/PremiumFeaturesScreen';
import ChallengesScreen from './screens/ChallengesScreen';
import AchievementsScreen from './screens/AchievementsScreen';
import SocialScreen from './screens/SocialScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// Custom Drawer Content Component
function CustomDrawerContent(props) {
  const theme = useTheme();
  const [isPremium, setIsPremium] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    checkPremium();
  }, []);

  const checkPremium = async () => {
    try {
      const { data: { user } } = await auth.getCurrentUser();
      if (user) {
        setUserId(user.id);
        const { data } = await userProfiles.isPremium(user.id);
        setIsPremium(data);
      }
    } catch (error) {
      console.error('Error checking premium:', error);
    }
  };

  const DrawerItem = ({ label, icon, route, isPremiumFeature = false, badge = null }) => {
    const isFocused = props.state.routes[props.state.index].name === route;
    
    return (
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 20,
          backgroundColor: isFocused ? theme.colors.primary + '20' : 'transparent',
          borderLeftWidth: 3,
          borderLeftColor: isFocused ? theme.colors.primary : 'transparent',
        }}
        onPress={() => props.navigation.navigate(route)}
      >
        <Ionicons 
          name={icon} 
          size={24} 
          color={isFocused ? theme.colors.primary : theme.colors.text} 
        />
        <Text style={{
          marginLeft: 15,
          fontSize: 16,
          fontWeight: isFocused ? 'bold' : 'normal',
          color: isFocused ? theme.colors.primary : theme.colors.text,
          flex: 1,
        }}>
          {label}
        </Text>
        {isPremiumFeature && !isPremium && (
          <View style={{
            backgroundColor: '#FFD700',
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 12,
          }}>
            <Text style={{ color: '#000', fontSize: 10, fontWeight: 'bold' }}>PRO</Text>
          </View>
        )}
        {badge && (
          <View style={{
            backgroundColor: theme.colors.primary,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 12,
          }}>
            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>{badge}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Header */}
      <View style={{
        paddingVertical: 30,
        paddingHorizontal: 20,
        backgroundColor: theme.colors.primary,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Ionicons name="person" size={32} color={theme.colors.primary} />
          </View>
          <View style={{ marginLeft: 15, flex: 1 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }}>
              Habit Tracker
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              {isPremium ? (
                <>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={{ color: '#FFFFFF', fontSize: 12, marginLeft: 4 }}>
                    Premium Member
                  </Text>
                </>
              ) : (
                <Text style={{ color: '#FFFFFF', fontSize: 12 }}>Free Plan</Text>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <View style={{ flex: 1, paddingTop: 10 }}>
        <Text style={{
          paddingHorizontal: 20,
          paddingVertical: 10,
          fontSize: 12,
          fontWeight: 'bold',
          color: theme.colors.textSecondary,
          textTransform: 'uppercase',
        }}>
          Main
        </Text>
        <DrawerItem label="Home" icon="home" route="HomeTabs" />
        <DrawerItem label="Habits" icon="checkmark-circle" route="Habits" />
        <DrawerItem label="Statistics" icon="bar-chart" route="Statistics" />
        
        <View style={{
          height: 1,
          backgroundColor: theme.colors.border,
          marginVertical: 15,
          marginHorizontal: 20,
        }} />

        <Text style={{
          paddingHorizontal: 20,
          paddingVertical: 10,
          fontSize: 12,
          fontWeight: 'bold',
          color: theme.colors.textSecondary,
          textTransform: 'uppercase',
        }}>
          Premium Features
        </Text>
        <DrawerItem 
          label="Challenges" 
          icon="trophy" 
          route="Challenges" 
          isPremiumFeature={true}
          badge="NEW"
        />
        <DrawerItem 
          label="Achievements" 
          icon="medal" 
          route="Achievements" 
          isPremiumFeature={true}
          badge="NEW"
        />
        <DrawerItem 
          label="Social & Leaderboard" 
          icon="people" 
          route="Social" 
          isPremiumFeature={true}
          badge="NEW"
        />
        <DrawerItem 
          label="Premium Features" 
          icon="star" 
          route="PremiumFeatures" 
        />

        <View style={{
          height: 1,
          backgroundColor: theme.colors.border,
          marginVertical: 15,
          marginHorizontal: 20,
        }} />

        <Text style={{
          paddingHorizontal: 20,
          paddingVertical: 10,
          fontSize: 12,
          fontWeight: 'bold',
          color: theme.colors.textSecondary,
          textTransform: 'uppercase',
        }}>
          Account
        </Text>
        <DrawerItem label="Profile" icon="person" route="Profile" />
        {!isPremium && (
          <DrawerItem label="Upgrade to Premium" icon="rocket" route="Payment" />
        )}
      </View>

      {/* Footer */}
      <View style={{
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
      }}>
        <Text style={{
          fontSize: 12,
          color: theme.colors.textSecondary,
          textAlign: 'center',
        }}>
          Version 2.0 • Habit Tracker
        </Text>
      </View>
    </View>
  );
}

function TabNavigator() {
  const theme = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Habits') {
            iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
          } else if (route.name === 'Statistics') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          borderTopColor: theme.colors.tabBarBorder,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'Habit Tracker',
        }}
      />
      <Tab.Screen name="Habits" component={HabitsScreen} />
      <Tab.Screen name="Statistics" component={StatisticsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function DrawerNavigator() {
  const theme = useTheme();
  
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerStyle: {
          backgroundColor: theme.colors.background,
          width: 280,
        },
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Drawer.Screen 
        name="HomeTabs" 
        component={TabNavigator}
        options={{
          title: 'Habit Tracker',
          drawerLabel: 'Home',
        }}
      />
      <Drawer.Screen 
        name="Challenges" 
        component={ChallengesScreen}
        options={{
          title: 'Challenges',
        }}
      />
      <Drawer.Screen 
        name="Achievements" 
        component={AchievementsScreen}
        options={{
          title: 'Achievements',
        }}
      />
      <Drawer.Screen 
        name="Social" 
        component={SocialScreen}
        options={{
          title: 'Social & Leaderboard',
        }}
      />
      <Drawer.Screen 
        name="PremiumFeatures" 
        component={PremiumFeaturesScreen}
        options={{
          title: 'Premium Features',
        }}
      />
    </Drawer.Navigator>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const { colors, isDark } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check initial auth state
    checkAuthState();

    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      setIsLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const checkAuthState = async () => {
    try {
      const { data: { user } } = await auth.getCurrentUser();
      setIsAuthenticated(!!user);
    } catch (error) {
      console.error('Error checking auth state:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const customLightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background || '#FFFFFF',
      card: colors.card || '#FFFFFF',
      text: colors.text || '#1C1C1E',
      border: colors.cardBorder || '#E5E5EA',
      primary: colors.primary || '#007AFF',
    },
  };

  const customDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: colors.background || '#000000',
      card: colors.card || '#1C1C1E',
      text: colors.text || '#FFFFFF',
      border: colors.cardBorder || '#38383A',
      primary: colors.primary || '#0A84FF',
    },
  };

  return (
    <NavigationContainer theme={isDark ? customDarkTheme : customLightTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator initialRouteName={isAuthenticated ? "Main" : "Login"} screenOptions={{ gestureEnabled: false }}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Subscription' }} />
        <Stack.Screen name="Main" component={DrawerNavigator} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
