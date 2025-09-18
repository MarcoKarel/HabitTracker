// Simple service worker for notifications
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(self.clients.claim());
});

// Handle background sync for habit reminders
self.addEventListener('sync', (event) => {
  if (event.tag === 'habit-reminder') {
    event.waitUntil(sendHabitReminder());
  }
});

// Handle push notifications (for future backend integration)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: data.data,
      actions: [
        {
          action: 'view',
          title: 'View Habits'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

async function sendHabitReminder() {
  try {
    const registration = await self.registration;
    await registration.showNotification('🎯 Habit Reminder', {
      body: "Don't forget to check your habits for today!",
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'daily-reminder',
      data: {
        type: 'habit-reminder'
      }
    });
  } catch (error) {
    console.error('Error sending habit reminder:', error);
  }
}