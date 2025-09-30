import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    
    try {
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      if (!projectId) {
        throw new Error('Project ID not found');
      }
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (e) {
      token = `${Device.osName}-${Device.modelName}`;
    }
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
}

export async function scheduleHabitNotification(habitId, habitName, time, days = [1, 2, 3, 4, 5, 6, 0]) {
  // Cancel existing notifications for this habit
  await cancelHabitNotifications(habitId);

  const notificationIds = [];

  for (const day of days) {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Habit Reminder 🎯',
        body: `Time to complete: ${habitName}`,
        sound: true,
        data: { habitId, habitName },
      },
      trigger: {
        weekday: day === 0 ? 7 : day, // Sunday is 7 in expo-notifications
        hour: time.hour,
        minute: time.minute,
        repeats: true,
      },
    });
    notificationIds.push({ id: notificationId, day });
  }

  return notificationIds;
}

export async function cancelHabitNotifications(habitId) {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  
  for (const notification of scheduledNotifications) {
    if (notification.content.data?.habitId === habitId) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

export async function getAllScheduledNotifications() {
  return await Notifications.getAllScheduledNotificationsAsync();
}

export function formatTime(time) {
  const hour12 = time.hour === 0 ? 12 : time.hour > 12 ? time.hour - 12 : time.hour;
  const ampm = time.hour >= 12 ? 'PM' : 'AM';
  const minute = time.minute.toString().padStart(2, '0');
  return `${hour12}:${minute} ${ampm}`;
}

export const DAYS_OF_WEEK = [
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
  { id: 0, name: 'Sunday', short: 'Sun' },
];