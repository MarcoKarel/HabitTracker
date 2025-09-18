// Notification service for habit reminders and updates
export class NotificationService {
  private static instance: NotificationService;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  async showNotification(title: string, options: NotificationOptions = {}): Promise<void> {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);
  }

  async scheduleDailyReminder(time: string): Promise<void> {
    // In a real app, you'd use a service worker for background notifications
    // For now, we'll simulate with localStorage and check on app load
    
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const scheduledTime = new Date(now);
    scheduledTime.setHours(hours, minutes, 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilReminder = scheduledTime.getTime() - now.getTime();
    
    setTimeout(() => {
      this.showNotification('🎯 Habit Reminder', {
        body: "Don't forget to check your habits for today!",
        tag: 'daily-reminder'
      });
      
      // Schedule next day's reminder
      this.scheduleDailyReminder(time);
    }, timeUntilReminder);

    // Store in localStorage for persistence
    localStorage.setItem('habit-reminder-time', time);
  }

  showHabitCompletedNotification(habitTitle: string, streak: number): void {
    this.showNotification('✅ Habit Completed!', {
      body: `Great job completing "${habitTitle}"! Current streak: ${streak} days`,
      tag: 'habit-completed'
    });
  }

  showStreakMilestoneNotification(habitTitle: string, streak: number): void {
    const milestones = [7, 14, 21, 30, 50, 100];
    if (milestones.includes(streak)) {
      let message = '';
      if (streak === 7) message = '🎉 One week streak!';
      else if (streak === 14) message = '🔥 Two weeks strong!';
      else if (streak === 21) message = '💪 Three weeks of consistency!';
      else if (streak === 30) message = '🌟 One month milestone!';
      else if (streak === 50) message = '🚀 50 days is incredible!';
      else if (streak === 100) message = '👑 100 days - You\'re a legend!';

      this.showNotification(`${message}`, {
        body: `Congratulations on your ${streak}-day streak with "${habitTitle}"!`,
        tag: 'streak-milestone'
      });
    }
  }

  showWeeklyReportNotification(completedHabits: number, totalHabits: number): void {
    const completionRate = totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0;
    
    this.showNotification('📊 Weekly Report', {
      body: `This week: ${completedHabits}/${totalHabits} habits completed (${completionRate}%)`,
      tag: 'weekly-report'
    });
  }

  // Initialize notifications based on stored settings
  async initialize(): Promise<void> {
    const settings = localStorage.getItem('habit-tracker-settings');
    if (!settings) return;

    try {
      const parsedSettings = JSON.parse(settings);
      
      if (parsedSettings.notifications?.enabled) {
        const hasPermission = await this.requestPermission();
        
        if (hasPermission && parsedSettings.notifications.dailyReminder) {
          this.scheduleDailyReminder(parsedSettings.notifications.reminderTime || '09:00');
        }
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  // Check if we missed any reminders (called on app startup)
  checkMissedReminders(): void {
    const lastCheck = localStorage.getItem('last-notification-check');
    const now = new Date();
    
    if (lastCheck) {
      const lastCheckDate = new Date(lastCheck);
      const daysDifference = Math.floor((now.getTime() - lastCheckDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDifference > 1) {
        this.showNotification('👋 Welcome back!', {
          body: `You've been away for ${daysDifference} days. Ready to get back on track?`,
          tag: 'welcome-back'
        });
      }
    }
    
    localStorage.setItem('last-notification-check', now.toISOString());
  }
}

// Service worker registration for background notifications
export async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully:', registration);
    } catch (error) {
      console.log('Service Worker registration failed:', error);
    }
  }
}

// Push notification subscription (for future use with backend)
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      // You would need to generate VAPID keys for production
      applicationServerKey: null
    });
    
    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return null;
  }
}