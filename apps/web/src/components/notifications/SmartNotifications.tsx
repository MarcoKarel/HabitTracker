import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import type { Habit } from '@habit-tracker/shared';

interface NotificationService {
  scheduleReminder: (habit: Habit, time: string) => Promise<void>;
  celebrateStreak: (habit: Habit, streakCount: number) => void;
  celebrateMilestone: (habit: Habit, milestone: number) => void;
  sendMotivationalMessage: () => void;
  requestPermission: () => Promise<boolean>;
  isSupported: () => boolean;
}

interface SmartNotification {
  id: string;
  type: 'reminder' | 'streak' | 'milestone' | 'motivation' | 'achievement';
  title: string;
  message: string;
  icon: string;
  timestamp: Date;
  habitId?: string;
  action?: {
    label: string;
    callback: () => void;
  };
}

interface NotificationState {
  notifications: SmartNotification[];
  permission: NotificationPermission;
  enabled: boolean;
  reminderTime: string;
  motivationalEnabled: boolean;
  streakCelebrations: boolean;
  milestoneAlerts: boolean;
}

// Notification Bubble Component
const NotificationBubble = styled(motion.div)<{ $type: string }>`
  position: fixed;
  top: 24px;
  right: 24px;
  background: ${props => {
    switch (props.$type) {
      case 'streak': return 'linear-gradient(135deg, #ff6b6b, #ee5a6f)';
      case 'milestone': return 'linear-gradient(135deg, #ffd93d, #ff6b6b)';
      case 'achievement': return 'linear-gradient(135deg, #6c5ce7, #a29bfe)';
      case 'motivation': return 'linear-gradient(135deg, #00cec9, #55a3ff)';
      default: return 'linear-gradient(135deg, #667eea, #764ba2)';
    }
  }};
  color: white;
  padding: 16px 20px;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  max-width: 350px;
  z-index: 1000;
  backdrop-filter: blur(10px);
`;

const NotificationIcon = styled.div`
  font-size: 24px;
  margin-bottom: 8px;
`;

const NotificationTitle = styled.h4`
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
`;

const NotificationMessage = styled.p`
  margin: 0 0 12px 0;
  font-size: 14px;
  opacity: 0.9;
  line-height: 1.4;
`;

const NotificationAction = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
  }
`;

// Settings Panel Component
const SettingsPanel = styled(motion.div)`
  background: white;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px;
`;

const SettingsTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: #333;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SettingRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
`;

const SettingInfo = styled.div``;

const SettingLabel = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
`;

const SettingDescription = styled.div`
  font-size: 14px;
  color: #666;
`;

const Toggle = styled.label`
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
`;

const ToggleSlider = styled.input`
  opacity: 0;
  width: 0;
  height: 0;

  &:checked + span {
    background-color: #667eea;
  }

  &:checked + span:before {
    transform: translateX(26px);
  }
`;

const ToggleTrack = styled.span`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.4s;
  border-radius: 24px;

  &:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
  }
`;

const TimeInput = styled.input`
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  color: #333;
  
  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
`;

class WebNotificationService implements NotificationService {
  private static instance: WebNotificationService;
  private scheduledReminders: Map<string, number> = new Map();

  static getInstance(): WebNotificationService {
    if (!WebNotificationService.instance) {
      WebNotificationService.instance = new WebNotificationService();
    }
    return WebNotificationService.instance;
  }

  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async scheduleReminder(habit: Habit, time: string): Promise<void> {
    if (!this.isSupported() || Notification.permission !== 'granted') return;

    // Clear existing reminder
    const existingReminder = this.scheduledReminders.get(habit.id);
    if (existingReminder) {
      clearInterval(existingReminder);
    }

    // Parse time
    const [hours, minutes] = time.split(':').map(Number);
    
    // Schedule daily reminder
    const scheduleNext = () => {
      const now = new Date();
      const reminder = new Date();
      reminder.setHours(hours, minutes, 0, 0);
      
      // If time has passed today, schedule for tomorrow
      if (reminder <= now) {
        reminder.setDate(reminder.getDate() + 1);
      }
      
      const timeout = reminder.getTime() - now.getTime();
      
      setTimeout(() => {
        new Notification(`🎯 Time for "${habit.title}"!`, {
          body: `Keep your streak going! You're doing amazing.`,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: `reminder-${habit.id}`,
          requireInteraction: true
        });
        
        // Schedule next occurrence
        scheduleNext();
      }, timeout);
    };

    scheduleNext();
  }

  celebrateStreak(habit: Habit, streakCount: number): void {
    if (!this.isSupported() || Notification.permission !== 'granted') return;

    const messages = [
      `🔥 ${streakCount} days strong! You're unstoppable!`,
      `⚡ ${streakCount}-day streak! Keep the momentum!`,
      `🚀 ${streakCount} days in a row! You're crushing it!`,
      `💪 ${streakCount} consecutive days! Pure dedication!`
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    new Notification(`🎉 Streak Achievement!`, {
      body: `"${habit.title}": ${randomMessage}`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `streak-${habit.id}-${streakCount}`,
      requireInteraction: true
    });
  }

  celebrateMilestone(habit: Habit, milestone: number): void {
    if (!this.isSupported() || Notification.permission !== 'granted') return;

    const milestoneMessages: { [key: number]: string } = {
      7: `🎯 One week strong! "${habit.title}" is becoming a real habit!`,
      14: `💎 Two weeks! You're building something permanent with "${habit.title}"!`,
      21: `🧠 21 days! Scientists say you're rewiring your brain with "${habit.title}"!`,
      30: `🏆 ONE MONTH! "${habit.title}" is now part of who you are!`,
      60: `👑 Two months! You're a "${habit.title}" champion!`,
      90: `🌟 90 days! You've completely transformed with "${habit.title}"!`,
      100: `💯 CENTURY! 100 days of "${habit.title}" - You're incredible!`,
      365: `🎊 ONE YEAR! 365 days of "${habit.title}" - You're a legend!`
    };

    const message = milestoneMessages[milestone] || 
      `🎉 ${milestone} days of "${habit.title}"! Absolutely incredible!`;

    new Notification(`🏅 ${milestone}-Day Milestone!`, {
      body: message,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `milestone-${habit.id}-${milestone}`,
      requireInteraction: true
    });
  }

  sendMotivationalMessage(): void {
    if (!this.isSupported() || Notification.permission !== 'granted') return;

    const messages = [
      "🌅 New day, new opportunities! How will you grow today?",
      "💫 Small steps daily lead to big changes yearly!",
      "🎯 Your habits shape your future. Make them count!",
      "🌱 Progress, not perfection. Keep growing!",
      "⚡ You have the power to change your life, one habit at a time!",
      "🏔️ Every expert was once a beginner. Keep going!",
      "🔥 Consistency is the mother of mastery!",
      "🌟 Your future self will thank you for today's efforts!"
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    new Notification(`💪 Daily Motivation`, {
      body: randomMessage,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'motivation-daily',
      requireInteraction: true
    });
  }
}

export function SmartNotifications() {
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    permission: 'default',
    enabled: false,
    reminderTime: '09:00',
    motivationalEnabled: true,
    streakCelebrations: true,
    milestoneAlerts: true
  });

  const [showBubble, setShowBubble] = useState<SmartNotification | null>(null);
  const notificationService = WebNotificationService.getInstance();

  useEffect(() => {
    // Check current permission status
    if (notificationService.isSupported()) {
      setState(prev => ({
        ...prev,
        permission: Notification.permission,
        enabled: Notification.permission === 'granted'
      }));
    }
  }, []);

  // Schedule daily motivational message
  useEffect(() => {
    if (state.motivationalEnabled && state.enabled) {
      const [hours, minutes] = state.reminderTime.split(':').map(Number);
      const scheduleMotivational = () => {
        const now = new Date();
        const next = new Date();
        next.setHours(hours + 1, minutes, 0, 0); // 1 hour after reminder time
        
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
        
        const timeout = next.getTime() - now.getTime();
        setTimeout(() => {
          notificationService.sendMotivationalMessage();
          scheduleMotivational();
        }, timeout);
      };
      
      scheduleMotivational();
    }
  }, [state.motivationalEnabled, state.enabled, state.reminderTime]);

  const handleRequestPermission = async () => {
    const granted = await notificationService.requestPermission();
    setState(prev => ({
      ...prev,
      permission: Notification.permission,
      enabled: granted
    }));
  };

  const handleToggleEnabled = (enabled: boolean) => {
    if (enabled && state.permission !== 'granted') {
      handleRequestPermission();
    } else {
      setState(prev => ({ ...prev, enabled }));
    }
  };

  const showNotificationBubble = useCallback((notification: SmartNotification) => {
    setShowBubble(notification);
    setTimeout(() => setShowBubble(null), 5000);
  }, []);

  // Test notification function
  const testNotification = () => {
    const testNotif: SmartNotification = {
      id: 'test',
      type: 'motivation',
      title: 'Test Notification',
      message: 'This is a test notification to make sure everything works!',
      icon: '🧪',
      timestamp: new Date()
    };
    showNotificationBubble(testNotif);

    if (state.enabled) {
      notificationService.sendMotivationalMessage();
    }
  };

  return (
    <>
      <SettingsPanel
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <SettingsTitle>
          🔔 Smart Notifications
        </SettingsTitle>

        <SettingRow>
          <SettingInfo>
            <SettingLabel>Enable Notifications</SettingLabel>
            <SettingDescription>
              Get reminders and celebrations for your habits
            </SettingDescription>
          </SettingInfo>
          <Toggle>
            <ToggleSlider
              type="checkbox"
              checked={state.enabled}
              onChange={(e) => handleToggleEnabled(e.target.checked)}
            />
            <ToggleTrack />
          </Toggle>
        </SettingRow>

        <SettingRow>
          <SettingInfo>
            <SettingLabel>Daily Reminder Time</SettingLabel>
            <SettingDescription>
              When should we remind you about your habits?
            </SettingDescription>
          </SettingInfo>
          <TimeInput
            type="time"
            value={state.reminderTime}
            onChange={(e) => setState(prev => ({ ...prev, reminderTime: e.target.value }))}
            disabled={!state.enabled}
          />
        </SettingRow>

        <SettingRow>
          <SettingInfo>
            <SettingLabel>Streak Celebrations</SettingLabel>
            <SettingDescription>
              Get notified when you maintain streaks
            </SettingDescription>
          </SettingInfo>
          <Toggle>
            <ToggleSlider
              type="checkbox"
              checked={state.streakCelebrations}
              onChange={(e) => setState(prev => ({ ...prev, streakCelebrations: e.target.checked }))}
              disabled={!state.enabled}
            />
            <ToggleTrack />
          </Toggle>
        </SettingRow>

        <SettingRow>
          <SettingInfo>
            <SettingLabel>Milestone Alerts</SettingLabel>
            <SettingDescription>
              Celebrate major achievements (7, 21, 30+ days)
            </SettingDescription>
          </SettingInfo>
          <Toggle>
            <ToggleSlider
              type="checkbox"
              checked={state.milestoneAlerts}
              onChange={(e) => setState(prev => ({ ...prev, milestoneAlerts: e.target.checked }))}
              disabled={!state.enabled}
            />
            <ToggleTrack />
          </Toggle>
        </SettingRow>

        <SettingRow>
          <SettingInfo>
            <SettingLabel>Daily Motivation</SettingLabel>
            <SettingDescription>
              Receive inspiring messages to keep you motivated
            </SettingDescription>
          </SettingInfo>
          <Toggle>
            <ToggleSlider
              type="checkbox"
              checked={state.motivationalEnabled}
              onChange={(e) => setState(prev => ({ ...prev, motivationalEnabled: e.target.checked }))}
              disabled={!state.enabled}
            />
            <ToggleTrack />
          </Toggle>
        </SettingRow>

        <SettingRow>
          <SettingInfo>
            <SettingLabel>Test Notifications</SettingLabel>
            <SettingDescription>
              Send a test notification to make sure everything works
            </SettingDescription>
          </SettingInfo>
          <NotificationAction
            onClick={testNotification}
            style={{ background: '#667eea', color: 'white', border: '1px solid #667eea' }}
          >
            Send Test
          </NotificationAction>
        </SettingRow>

        {state.permission === 'denied' && (
          <div style={{ 
            background: '#fee2e2', 
            color: '#dc2626', 
            padding: '12px', 
            borderRadius: '8px', 
            marginTop: '16px',
            fontSize: '14px'
          }}>
            ⚠️ Notifications are blocked. Please enable them in your browser settings.
          </div>
        )}

        {!notificationService.isSupported() && (
          <div style={{ 
            background: '#fef3c7', 
            color: '#d97706', 
            padding: '12px', 
            borderRadius: '8px', 
            marginTop: '16px',
            fontSize: '14px'
          }}>
            ⚠️ Notifications are not supported in this browser.
          </div>
        )}
      </SettingsPanel>

      {/* Notification Bubble */}
      <AnimatePresence>
        {showBubble && (
          <NotificationBubble
            $type={showBubble.type}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <NotificationIcon>{showBubble.icon}</NotificationIcon>
            <NotificationTitle>{showBubble.title}</NotificationTitle>
            <NotificationMessage>{showBubble.message}</NotificationMessage>
            {showBubble.action && (
              <NotificationAction onClick={showBubble.action.callback}>
                {showBubble.action.label}
              </NotificationAction>
            )}
          </NotificationBubble>
        )}
      </AnimatePresence>
    </>
  );
}

export { WebNotificationService };
export type { NotificationService, SmartNotification };