import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { StorageService } from './StorageService';
import { ContentService } from './ContentService';
import { UnlockService } from './UnlockService';
import API_CONFIG from '../config/api';
import Constants from 'expo-constants';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
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

    // Set up notification category with interactive actions
    try {
      await Notifications.setNotificationCategoryAsync('tidbit_feedback', [
        {
          identifier: 'knew',
          buttonTitle: '✅ I knew it',
          options: {
            opensAppToForeground: false, // Don't open app when action is pressed
          },
        },
        {
          identifier: 'didnt_know',
          buttonTitle: '❓ I didn\'t',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: 'save',
          buttonTitle: '💾 Save',
          options: {
            opensAppToForeground: false,
          },
        },
      ], {
        previewPlaceholder: 'Tap to view tidbit',
      });
      console.log('[NOTIFICATION_CATEGORY] Category "tidbit_feedback" set up successfully');
      
      // Immediately verify it was registered
      try {
        const allCategories = await Notifications.getNotificationCategoriesAsync();
        console.log('[NOTIFICATION_CATEGORY] All categories after init setup:', allCategories.map(c => c.identifier));
        const ourCategory = allCategories.find(cat => cat.identifier === 'tidbit_feedback');
        if (ourCategory) {
          console.log('[NOTIFICATION_CATEGORY] Category verified in init:', JSON.stringify(ourCategory, null, 2));
        } else {
          console.error('[NOTIFICATION_CATEGORY] Category NOT found after init setup!');
        }
      } catch (error) {
        console.error('[NOTIFICATION_CATEGORY] Error verifying category in init:', error);
      }
    } catch (error) {
      console.error('[NOTIFICATION_CATEGORY] Error setting up category:', error);
    }

    // Register device for push notifications
    await this.registerDeviceToken();

    return true;
  }

  /**
   * Register device push token with server
   */
  static async registerDeviceToken() {
    try {
      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      
      const pushToken = tokenData.data;
      console.log('[PUSH_NOTIFICATIONS] Expo push token:', pushToken.substring(0, 20) + '...');
      
      // Register token with server
      if (API_CONFIG && API_CONFIG.BASE_URL && API_CONFIG.BASE_URL !== 'https://your-production-server.com') {
        try {
          const response = await fetch(`${API_CONFIG.BASE_URL}/api/register-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token: pushToken,
              platform: Platform.OS,
              appVersion: Constants.expoConfig?.version || '1.0.0',
            }),
          });
          
          const result = await response.json();
          if (result.success) {
            console.log('[PUSH_NOTIFICATIONS] Device token registered successfully');
            // Store token locally for reference
            await StorageService.setItem('push_token', pushToken);
          } else {
            console.error('[PUSH_NOTIFICATIONS] Failed to register token:', result.error);
          }
        } catch (error) {
          console.error('[PUSH_NOTIFICATIONS] Error registering token with server:', error);
          // Don't fail init if server is unavailable - app can still work
        }
      } else {
        console.warn('[PUSH_NOTIFICATIONS] No server URL configured, skipping token registration');
      }
    } catch (error) {
      console.error('[PUSH_NOTIFICATIONS] Error getting Expo push token:', error);
      // Don't fail init if push token fails - app can still work with local notifications
    }
  }

  /**
   * Ensure notification category is set up (call before sending notifications)
   */
  static async ensureCategorySetup() {
    try {
      await Notifications.setNotificationCategoryAsync('tidbit_feedback', [
        {
          identifier: 'knew',
          buttonTitle: '✅ I knew it',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: 'didnt_know',
          buttonTitle: '❓ I didn\'t',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: 'save',
          buttonTitle: '💾 Save',
          options: {
            opensAppToForeground: false,
          },
        },
      ], {
        previewPlaceholder: 'Tap to view tidbit',
      });
      
      // Verify category was set up by checking all categories
      try {
        const allCategories = await Notifications.getNotificationCategoriesAsync();
        console.log('[NOTIFICATION_CATEGORY] All registered categories:', allCategories);
        const ourCategory = allCategories.find(cat => cat.identifier === 'tidbit_feedback');
        if (ourCategory) {
          console.log('[NOTIFICATION_CATEGORY] Our category found:', JSON.stringify(ourCategory, null, 2));
        } else {
          console.warn('[NOTIFICATION_CATEGORY] Category "tidbit_feedback" not found in registered categories!');
        }
      } catch (error) {
        console.error('[NOTIFICATION_CATEGORY] Error checking categories:', error);
      }
      
      console.log('[NOTIFICATION_CATEGORY] Category ensured');
    } catch (error) {
      console.error('[NOTIFICATION_CATEGORY] Error ensuring category:', error);
    }
  }

  static async sendNotification(tidbit) {
    if (!tidbit) {
      // If no tidbit provided, get one (prioritize due tidbits)
      tidbit = await ContentService.getSmartTidbit();
      if (!tidbit) return null;
    }

    // Ensure category is set up before sending
    await this.ensureCategorySetup();
    
    // Wait a moment to ensure category is fully registered
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify category exists before sending
    try {
      const allCategories = await Notifications.getNotificationCategoriesAsync();
      console.log('[NOTIFICATION] Checking categories before send:', allCategories.map(c => ({ id: c.identifier, actions: c.actions?.length || 0 })));
      const categoryExists = allCategories.some(cat => cat.identifier === 'tidbit_feedback');
      if (!categoryExists) {
        console.error('[NOTIFICATION] Category not found! Re-registering...');
        await this.ensureCategorySetup();
        // Wait again after re-registering
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        const ourCategory = allCategories.find(cat => cat.identifier === 'tidbit_feedback');
        console.log('[NOTIFICATION] Category found with', ourCategory?.actions?.length || 0, 'actions');
      }
    } catch (error) {
      console.error('[NOTIFICATION] Error checking category:', error);
    }

    const notificationContent = {
      title: '📚 Tidbit',
      body: tidbit.text,
      data: {
        tidbit: JSON.stringify(tidbit),
        tidbitId: tidbit.id || null, // Include ID for spaced repetition
        category: tidbit.category,
      },
      sound: true,
      categoryId: 'tidbit_feedback', // Assign interactive category
    };

    console.log('[NOTIFICATION] Sending notification with categoryId:', notificationContent.categoryId);
    console.log('[NOTIFICATION] Full notification content:', JSON.stringify(notificationContent, null, 2));

    // Double-check category exists right before sending
    const allCategories = await Notifications.getNotificationCategoriesAsync();
    console.log('[NOTIFICATION] Categories available right before sending:', allCategories.map(c => c.identifier));
    const categoryExists = allCategories.some(cat => cat.identifier === 'tidbit_feedback');
    console.log('[NOTIFICATION] Category "tidbit_feedback" exists:', categoryExists);
    
    if (!categoryExists) {
      console.error('[NOTIFICATION] Category missing! Re-registering now...');
      await this.ensureCategorySetup();
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: null, // Send immediately
    });

    console.log('[NOTIFICATION] Notification sent successfully, ID:', notificationId);
    console.log('[NOTIFICATION] Notification content.categoryId was:', notificationContent.categoryId);
    
    return notificationId;
  }

  static async scheduleRecurringNotifications(intervalMinutes = 30) {
    // Cancel existing notifications first
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Check if notifications are enabled
    const enabled = await StorageService.getNotificationsEnabled();
    console.log('[DEBUG] scheduleRecurringNotifications:', { enabled, intervalMinutes });
    if (!enabled) {
      console.log('[DEBUG] Notifications disabled, returning');
      return;
    }

    // Get user's selected categories
    const categories = await StorageService.getSelectedCategories();
    console.log('[DEBUG] Categories:', categories);
    if (categories.length === 0) {
      console.log('[DEBUG] No categories selected, returning');
      return;
    }

    // Schedule notifications throughout the day
    const startHour = 8; // 8 AM
    const endHour = 2; // 2 AM (next day)
    // Total window spans from 8 AM today to 2 AM tomorrow (18 hours)
    const totalMinutes = (24 - startHour + endHour) * 60; // 8 AM to 2 AM next day = 18 hours
    const notificationsPerDay = Math.min(
      Math.floor(totalMinutes / intervalMinutes),
      100 // Max 100 notifications per day (daily limit)
    );

    // Since iOS doesn't respect repeats: true on date triggers,
    // we need to manually schedule multiple days of notifications
    // iOS has a limit of 64 scheduled notifications
    const iOS_MAX_NOTIFICATIONS = 64;
    // If notificationsPerDay exceeds iOS limit, only schedule today (up to 64 notifications)
    // Otherwise, schedule multiple days worth
    const daysToSchedule = notificationsPerDay > iOS_MAX_NOTIFICATIONS 
      ? 1 
      : Math.max(1, Math.floor(iOS_MAX_NOTIFICATIONS / notificationsPerDay));
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    
    const startTotalMinutes = startHour * 60;
    const endTotalMinutes = endHour * 60;
    
    // Calculate all time slots for a day (e.g., 8:00, 8:30, 9:00, ...)
    // Window: 8 AM to 2 AM next day, but capped at 20 notifications
    const timeSlots = [];
    for (let i = 0; i < notificationsPerDay; i++) {
      const slotTotalMinutes = startTotalMinutes + (i * intervalMinutes);
      const hour = Math.floor(slotTotalMinutes / 60);
      const minute = slotTotalMinutes % 60;
      
      // No break needed - we're already limited by notificationsPerDay
      // With 20 notifications at 30-min intervals, we get 8 AM to 6 PM
      timeSlots.push({ hour, minute, totalMinutes: slotTotalMinutes });
    }
    
    let scheduledCount = 0;
    
    // Schedule notifications for each day
    for (let dayOffset = 0; dayOffset < daysToSchedule && scheduledCount < iOS_MAX_NOTIFICATIONS; dayOffset++) {
      const scheduleDate = new Date();
      scheduleDate.setDate(scheduleDate.getDate() + dayOffset);
      scheduleDate.setHours(0, 0, 0, 0);
      scheduleDate.setSeconds(0, 0);
      scheduleDate.setMilliseconds(0);
      
      const isToday = dayOffset === 0;
      
      // For each time slot, schedule a notification
      for (const slot of timeSlots) {
        if (scheduledCount >= iOS_MAX_NOTIFICATIONS) break;
        
        const triggerDate = new Date(scheduleDate);
        // If slot hour is 0-2 (midnight to 2 AM), it's on the next day
        if (slot.hour >= 0 && slot.hour < startHour) {
          triggerDate.setDate(triggerDate.getDate() + 1);
        }
        triggerDate.setHours(slot.hour, slot.minute, 0, 0);
        triggerDate.setSeconds(0, 0);
        triggerDate.setMilliseconds(0);
        
        // Skip notifications in the past (for today only)
        // For slots after midnight, we need different logic
        if (isToday) {
          if (slot.hour >= startHour) {
            // Same-day slot (8 AM - 11:59 PM)
            if (slot.totalMinutes <= currentTotalMinutes) {
              continue;
            }
          } else {
            // Next-day slot (midnight - 2 AM) - always schedule for tomorrow
            // (this is handled by the date adjustment above)
          }
        }
        
        // Skip notifications before start time (safety check)
        if (slot.hour >= startHour && slot.totalMinutes < startTotalMinutes) {
          continue;
        }
        
        // Skip notifications after end time (past 2 AM)
        if (slot.hour > endHour && slot.hour < startHour) {
          continue;
        }
        
        // Check quiet hours if enabled
        const quietHoursEnabled = await StorageService.getQuietHoursEnabled();
        if (quietHoursEnabled) {
          const quietHoursStart = await StorageService.getQuietHoursStart();
          const quietHoursEnd = await StorageService.getQuietHoursEnd();
          
          // Handle quiet hours that span midnight (e.g., 11pm to 9am)
          if (quietHoursStart > quietHoursEnd) {
            // Quiet hours span midnight (e.g., 23 to 9)
            if (slot.hour >= quietHoursStart || slot.hour < quietHoursEnd) {
              continue; // Skip this notification
            }
          } else {
            // Quiet hours within same day (e.g., 22 to 6)
            if (slot.hour >= quietHoursStart && slot.hour < quietHoursEnd) {
              continue; // Skip this notification
            }
          }
        }
        
        // Make sure trigger date is in the future
        if (triggerDate <= now) {
          continue;
        }

        // Get a tidbit for this notification (prioritize due tidbits)
        const tidbit = await ContentService.getSmartTidbit();
        if (!tidbit) break;

        // Check if we're in the last 10 notifications (encourage app refresh)
        const notificationsRemaining = iOS_MAX_NOTIFICATIONS - scheduledCount;
        let notificationBody = tidbit.text;
        if (notificationsRemaining <= 10 && notificationsRemaining > 0) {
          notificationBody = `${tidbit.text}\n\n📱 Open the app to refresh your learning!`;
        }

        try {
          // Ensure category is set up (only need to do this once, but safe to call multiple times)
          if (scheduledCount === 0) {
            await this.ensureCategorySetup();
          }

          await Notifications.scheduleNotificationAsync({
            content: {
              title: '📚 Tidbit',
              // Let iOS/Android handle truncation & expanded view; we send full text
              body: notificationBody,
            data: {
              scheduled: true,
              tidbit: JSON.stringify(tidbit),
              tidbitId: tidbit.id || null, // Include ID for spaced repetition
              category: tidbit.category,
              hour: slot.hour,
              minute: slot.minute,
            },
              sound: true,
              categoryId: 'tidbit_feedback', // Assign interactive category
            },
            trigger: {
              type: 'date',
              date: triggerDate,
            },
          });
          scheduledCount++;
        } catch (error) {
          console.error('[DEBUG] Error scheduling notification:', error);
        }
      }
    }
    
    console.log('[DEBUG] Scheduled', scheduledCount, 'notifications for', daysToSchedule, 'days');
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

    // Handle notification taps and action button presses
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      // Check if this is an action button press or a tap
      const actionIdentifier = response.actionIdentifier;
      
      if (actionIdentifier && actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
        // This is an action button press (not a tap)
        // Pass the action identifier in the response
        if (onNotificationTapped) {
          onNotificationTapped(response);
        }
      } else {
        // This is a regular notification tap
        if (onNotificationTapped) {
          onNotificationTapped(response);
        }
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

  static async getAllScheduledNotifications() {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  /**
   * Check if notifications need to be rescheduled (if running low)
   * Returns true if rescheduling is recommended (less than 24 hours of notifications remain)
   */
  static async shouldRescheduleNotifications() {
    // Only for iOS (Android doesn't have the 64 limit issue the same way)
    if (Platform.OS !== 'ios') {
      return false;
    }

    // Check if notifications are enabled
    const enabled = await StorageService.getNotificationsEnabled();
    if (!enabled) {
      return false;
    }

    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      
      // If we have no scheduled notifications, we should reschedule
      if (scheduled.length === 0) {
        return true;
      }

      // Find the latest scheduled notification
      let latestTime = 0;
      for (const notification of scheduled) {
        let notificationTime = 0;
        
        // Parse the trigger to get the scheduled time
        if (notification.trigger && notification.trigger.type === 'timeInterval' && notification.trigger.seconds) {
          // timeInterval trigger: seconds until notification
          notificationTime = Date.now() + notification.trigger.seconds * 1000;
        } else if (notification.content && notification.content.data && notification.content.data.hour !== undefined) {
          // Use hour/minute from notification data
          const now = new Date();
          const triggerDate = new Date();
          triggerDate.setHours(notification.content.data.hour, notification.content.data.minute || 0, 0, 0);
          if (triggerDate < now) {
            triggerDate.setDate(triggerDate.getDate() + 1);
          }
          notificationTime = triggerDate.getTime();
        } else if (notification.trigger && notification.trigger.date) {
          // date trigger
          notificationTime = new Date(notification.trigger.date).getTime();
        }
        
        if (notificationTime > latestTime) {
          latestTime = notificationTime;
        }
      }

      // If we found a latest time, check if it's less than 24 hours away
      if (latestTime > 0) {
        const hoursUntilLastNotification = (latestTime - Date.now()) / (1000 * 60 * 60);
        // Reschedule if less than 24 hours remain
        return hoursUntilLastNotification < 24;
      }

      // If we couldn't parse times, reschedule to be safe
      return scheduled.length < 20; // If we have very few notifications, reschedule
    } catch (error) {
      console.error('[DEBUG] Error checking scheduled notifications:', error);
      // On error, don't reschedule (we don't want to spam)
      return false;
    }
  }

  /**
   * Check and reschedule notifications if needed (called on app foreground)
   */
  static async checkAndRescheduleIfNeeded() {
    try {
      const shouldReschedule = await this.shouldRescheduleNotifications();
      
      if (shouldReschedule) {
        console.log('[DEBUG] Rescheduling notifications (running low)');
        const interval = await StorageService.getNotificationInterval();
        await this.scheduleRecurringNotifications(interval);
        console.log('[DEBUG] Notifications rescheduled successfully');
      }
    } catch (error) {
      console.error('[DEBUG] Error checking/rescheduling notifications:', error);
    }
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

