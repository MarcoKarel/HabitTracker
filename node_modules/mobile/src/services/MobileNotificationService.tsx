import React from 'react';
import {
  Alert,
} from 'react-native';

// Simple notification data interface
interface NotificationData {
  habitId: string;
  habitTitle: string;
  type: 'reminder' | 'streak' | 'milestone' | 'motivation';
}

interface ScheduledNotification {
  id: string;
  habitId: string;
  type: string;
  scheduledTime: Date;
}

// Simple settings interface
interface NotificationSettings {
  enabled: boolean;
  reminderTime: string;
  streakMilestones: boolean;
  motivationalMessages: boolean;
}

export class MobileNotificationService {
  private static instance: MobileNotificationService;
  private scheduledNotifications: ScheduledNotification[] = [];
  private settings: NotificationSettings = {
    enabled: false,
    reminderTime: '09:00',
    streakMilestones: true,
    motivationalMessages: true,
  };

  static getInstance(): MobileNotificationService {
    if (!MobileNotificationService.instance) {
      MobileNotificationService.instance = new MobileNotificationService();
    }
    return MobileNotificationService.instance;
  }

  async initialize(): Promise<boolean> {
    try {
      // For now, just return true - in a real app you'd request permissions
      console.log('Mobile notification service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      // Simplified permission request
      Alert.alert(
        'Enable Notifications',
        'Would you like to receive habit reminders?',
        [
          { text: 'No', onPress: () => {}, style: 'cancel' },
          { text: 'Yes', onPress: () => this.enableNotifications() }
        ]
      );
      return true;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  private enableNotifications() {
    this.settings.enabled = true;
    console.log('Notifications enabled');
  }

  async scheduleHabitReminder(
    habitId: string,
    habitTitle: string,
    time: string
  ): Promise<string | null> {
    try {
      const notificationId = `reminder_${habitId}_${Date.now()}`;
      
      // Store notification info
      const notification: ScheduledNotification = {
        id: notificationId,
        habitId,
        type: 'reminder',
        scheduledTime: new Date(), // Simplified for now
      };
      
      this.scheduledNotifications.push(notification);
      console.log(`Scheduled reminder for ${habitTitle} at ${time}`);
      
      return notificationId;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
    }
  }

  async sendStreakCelebration(habitTitle: string, streakCount: number): Promise<void> {
    try {
      if (!this.settings.enabled || !this.settings.streakMilestones) return;

      // Simple alert for now - in real app would be a push notification
      Alert.alert(
        '🔥 Streak Achievement!',
        `Congratulations! You've maintained a ${streakCount}-day streak for "${habitTitle}"!`,
        [{ text: 'Awesome!', onPress: () => {} }]
      );
    } catch (error) {
      console.error('Failed to send streak celebration:', error);
    }
  }

  async sendMilestoneNotification(habitTitle: string, milestone: number): Promise<void> {
    try {
      if (!this.settings.enabled) return;

      Alert.alert(
        '🎉 Milestone Reached!',
        `You've completed "${habitTitle}" ${milestone} times!`,
        [{ text: 'Great!', onPress: () => {} }]
      );
    } catch (error) {
      console.error('Failed to send milestone notification:', error);
    }
  }

  async sendMotivationalMessage(): Promise<void> {
    try {
      if (!this.settings.enabled || !this.settings.motivationalMessages) return;

      const messages = [
        "You're doing great! Keep up the momentum!",
        "Small steps lead to big changes!",
        "Consistency is key - you've got this!",
        "Every day is a new opportunity to build good habits!",
      ];

      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      
      Alert.alert('💪 Daily Motivation', randomMessage, [
        { text: 'Thanks!', onPress: () => {} }
      ]);
    } catch (error) {
      console.error('Failed to send motivational message:', error);
    }
  }

  async cancelNotification(notificationId: string): Promise<void> {
    try {
      this.scheduledNotifications = this.scheduledNotifications.filter(
        n => n.id !== notificationId
      );
      console.log(`Cancelled notification: ${notificationId}`);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      this.scheduledNotifications = [];
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  async updateSettings(newSettings: Partial<NotificationSettings>): Promise<void> {
    try {
      this.settings = { ...this.settings, ...newSettings };
      console.log('Notification settings updated:', this.settings);
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  }

  getScheduledNotifications(): ScheduledNotification[] {
    return [...this.scheduledNotifications];
  }
}

// React component for notification management
export const NotificationManager: React.FC = () => {
  const [service] = React.useState(() => MobileNotificationService.getInstance());

  React.useEffect(() => {
    service.initialize();
  }, [service]);

  return null; // This is a service component, no UI needed
};

export default MobileNotificationService;