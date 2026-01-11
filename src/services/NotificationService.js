import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { StorageService } from './StorageService';
import { ContentService } from './ContentService';
import { UnlockService } from './UnlockService';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  static notificationListener = null;
  static responseListener = null;

  static async init() {
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permissions not granted');
      return false;
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('tidbits', {
        name: 'Tidbits',
        description: 'Notifications for daily tidbits',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366f1',
      });
    }

    return true;
  }

  static async sendNotification(tidbit) {
    if (!tidbit) {
      // If no tidbit provided, get one
      tidbit = await ContentService.getRandomTidbit();
      if (!tidbit) return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📚 Tidbit',
        body: tidbit.text,
        data: {
          tidbit: JSON.stringify(tidbit),
          category: tidbit.category,
        },
        sound: true,
      },
      trigger: null, // Send immediately
    });

    return notificationId;
  }

  static async scheduleRecurringNotifications(intervalMinutes = 30) {
    // Cancel existing notifications first
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Check if notifications are enabled
    const enabled = await StorageService.getNotificationsEnabled();
    if (!enabled) {
      return;
    }

    // Get user's selected categories
    const categories = await StorageService.getSelectedCategories();
    if (categories.length === 0) {
      return;
    }

    // Schedule notifications throughout the day
    const startHour = 8; // 8 AM
    const endHour = 22; // 10 PM
    const totalMinutes = (endHour - startHour) * 60;
    const notificationsPerDay = Math.min(
      Math.floor(totalMinutes / intervalMinutes),
      20 // Max 20 notifications per day (daily limit)
    );

    // Get a tidbit for each scheduled notification
    for (let i = 0; i < notificationsPerDay; i++) {
      const hour = startHour + Math.floor((i * intervalMinutes) / 60);
      const minute = (i * intervalMinutes) % 60;

      // Get a tidbit for this notification
      const tidbit = await ContentService.getRandomTidbit();
      if (!tidbit) break;

      // Schedule for today (or next occurrence)
      const triggerDate = new Date();
      triggerDate.setHours(hour, minute, 0, 0);
      triggerDate.setSeconds(0, 0);
      
      const now = new Date();
      if (triggerDate < now) {
        // If time has passed today, schedule for tomorrow
        triggerDate.setDate(triggerDate.getDate() + 1);
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📚 Tidbit',
          body: tidbit.text.length > 80 ? tidbit.text.substring(0, 77) + '...' : tidbit.text,
          data: {
            scheduled: true,
            tidbit: JSON.stringify(tidbit),
            category: tidbit.category,
            hour,
            minute,
          },
          sound: true,
        },
        trigger: {
          date: triggerDate,
          repeats: true, // Repeat daily
        },
      });
    }
  }

  static async updateNotificationSchedule() {
    // Reschedule notifications with current interval setting (iOS)
    if (Platform.OS === 'ios') {
      const interval = await StorageService.getNotificationInterval();
      await this.scheduleRecurringNotifications(interval);
    }
  }

  static async setupNotificationListeners(onNotificationReceived, onNotificationTapped) {
    // Handle notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    });

    // Handle notification taps
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      if (onNotificationTapped) {
        onNotificationTapped(response);
      }
    });
  }

  static async removeListeners() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
  }

  static async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  static async getBadgeCount() {
    return await Notifications.getBadgeCountAsync();
  }

  static async setBadgeCount(count) {
    await Notifications.setBadgeCountAsync(count);
  }

  static async getPermissions() {
    return await Notifications.getPermissionsAsync();
  }
}

export { NotificationService };

