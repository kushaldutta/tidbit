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

    // IMPORTANT: Set up notification category with interactive actions
    // This must be done before any push notifications arrive
    await this.ensureCategorySetup();

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
          // Get user preferences to send with token registration
          const notificationInterval = await StorageService.getNotificationInterval();
          const notificationsEnabled = await StorageService.getNotificationsEnabled();
          const quietHoursEnabled = await StorageService.getQuietHoursEnabled();
          const quietHoursStart = await StorageService.getQuietHoursStart();
          const quietHoursEnd = await StorageService.getQuietHoursEnd();
          const selectedCategories = await StorageService.getSelectedCategories();
          
          const response = await fetch(`${API_CONFIG.BASE_URL}/api/register-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token: pushToken,
              platform: Platform.OS,
              appVersion: Constants.expoConfig?.version || '1.0.0',
              notificationInterval,
              notificationsEnabled,
              quietHoursEnabled,
              quietHoursStart,
              quietHoursEnd,
              selectedCategories,
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

  /**
   * Send a test push notification through the server
   * This ensures action buttons work correctly
   */
  static async sendTestPushNotification(tidbit) {
    if (!tidbit) {
      // If no tidbit provided, get one (prioritize due tidbits)
      tidbit = await ContentService.getSmartTidbit();
      if (!tidbit) return null;
    }

    // Ensure category is set up on client
    await this.ensureCategorySetup();

    try {
      // Get push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      const pushToken = tokenData.data;

      // Send push notification through server
      if (API_CONFIG && API_CONFIG.BASE_URL && API_CONFIG.BASE_URL !== 'https://your-production-server.com') {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/send-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: pushToken,
            title: '📚 Tidbit',
            body: tidbit.text,
            data: {
              tidbit: JSON.stringify(tidbit),
              tidbitId: tidbit.id || null,
              category: tidbit.category,
            },
            categoryId: 'tidbit_feedback', // Important: include categoryId for action buttons
          }),
        });

        const result = await response.json();
        if (result.success) {
          console.log('[TEST_NOTIFICATION] Push notification sent successfully');
          return true;
        } else {
          console.error('[TEST_NOTIFICATION] Failed to send:', result.error);
          return false;
        }
      } else {
        console.warn('[TEST_NOTIFICATION] No server URL configured');
        return false;
      }
    } catch (error) {
      console.error('[TEST_NOTIFICATION] Error sending push notification:', error);
      return false;
    }
  }

  /**
   * DEPRECATED: Use sendTestPushNotification for push notifications with action buttons
   * This method is kept for backward compatibility but uses local notifications
   */
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

  // OLD LOCAL NOTIFICATION SCHEDULING REMOVED
  // We now use push notifications from the server instead
  // The server handles all scheduling via cron jobs

  static async setupNotificationListeners(onNotificationReceived, onNotificationTapped) {
    // IMPORTANT: Ensure category is registered before setting up listeners
    // This is critical for push notifications that arrive when app is closed
    await this.ensureCategorySetup();
    
    // Handle notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(async (notification) => {
      // Re-ensure category when notification arrives (in case it wasn't registered)
      await this.ensureCategorySetup();
      
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    });

    // Handle notification taps and action button presses
    this.responseListener = Notifications.addNotificationResponseReceivedListener(async (response) => {
      // Ensure category is registered (should already be, but be safe)
      await this.ensureCategorySetup();
      
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

  // OLD LOCAL NOTIFICATION RESCHEDULING REMOVED
  // Push notifications are handled entirely by the server
  // No need to reschedule locally

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

