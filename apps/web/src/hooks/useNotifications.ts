import { useEffect, useCallback } from 'react';
import { WebNotificationService } from '../components/notifications/SmartNotifications';
import type { HabitWithCompletions } from '@habit-tracker/shared';

interface UseNotificationsProps {
  habits: HabitWithCompletions[];
}

export function useNotifications({ habits }: UseNotificationsProps) {
  const notificationService = WebNotificationService.getInstance();

  // Track streak changes and trigger celebrations
  useEffect(() => {
    habits.forEach(habit => {
      const currentStreak = habit.current_streak || 0;
      
      // Check for streak celebrations (daily streaks)
      if (currentStreak > 0 && habit.is_completed_today) {
        // Celebrate every streak
        if (currentStreak > 1) {
          notificationService.celebrateStreak(habit, currentStreak);
        }
        
        // Check for milestone achievements
        const milestones = [7, 14, 21, 30, 60, 90, 100, 365];
        if (milestones.includes(currentStreak)) {
          notificationService.celebrateMilestone(habit, currentStreak);
        }
      }
    });
  }, [habits, notificationService]);

  // Schedule reminders for habits with reminder times
  useEffect(() => {
    habits.forEach(habit => {
      if (habit.reminder_time && habit.is_active) {
        notificationService.scheduleReminder(habit, habit.reminder_time);
      }
    });
  }, [habits, notificationService]);

  // Request notification permission on first load
  useEffect(() => {
    if (notificationService.isSupported() && Notification.permission === 'default') {
      notificationService.requestPermission();
    }
  }, [notificationService]);

  const celebrateCompletion = useCallback((habit: HabitWithCompletions) => {
    const streak = habit.current_streak || 0;
    
    if (streak > 0) {
      notificationService.celebrateStreak(habit, streak);
    }
    
    // Check for milestone
    const milestones = [7, 14, 21, 30, 60, 90, 100, 365];
    if (milestones.includes(streak)) {
      setTimeout(() => {
        notificationService.celebrateMilestone(habit, streak);
      }, 1000); // Delay milestone notification
    }
  }, [notificationService]);

  const sendDailyMotivation = useCallback(() => {
    notificationService.sendMotivationalMessage();
  }, [notificationService]);

  return {
    celebrateCompletion,
    sendDailyMotivation,
    notificationService,
    isSupported: notificationService.isSupported(),
    hasPermission: Notification.permission === 'granted'
  };
}