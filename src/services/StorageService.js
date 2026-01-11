import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  SELECTED_CATEGORIES: 'selected_categories',
  TIDBITS_SEEN: 'tidbits_seen',
  DAILY_UNLOCKS: 'daily_unlocks',
  LAST_UNLOCK_DATE: 'last_unlock_date',
  DAILY_TIDBIT_COUNT: 'daily_tidbit_count',
  LAST_TIDBIT_DATE: 'last_tidbit_date',
  NOTIFICATION_INTERVAL: 'notification_interval', // iOS: interval in minutes
  NOTIFICATIONS_ENABLED: 'notifications_enabled', // Both: enable/disable notifications
};

class StorageService {
  static async init() {
    // Initialize default values if needed
    const categories = await this.getSelectedCategories();
    if (categories.length === 0) {
      // Default categories
      await this.setSelectedCategories(['tech', 'psychology', 'fun-facts']);
    }
  }

  // Categories
  static async getSelectedCategories() {
    try {
      const data = await AsyncStorage.getItem(KEYS.SELECTED_CATEGORIES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  static async setSelectedCategories(categories) {
    try {
      await AsyncStorage.setItem(KEYS.SELECTED_CATEGORIES, JSON.stringify(categories));
    } catch (error) {
      console.error('Error setting categories:', error);
    }
  }

  // Statistics
  static async getTidbitsSeen() {
    try {
      const count = await AsyncStorage.getItem(KEYS.TIDBITS_SEEN);
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      console.error('Error getting tidbits seen:', error);
      return 0;
    }
  }

  static async incrementTidbitsSeen() {
    try {
      const current = await this.getTidbitsSeen();
      await AsyncStorage.setItem(KEYS.TIDBITS_SEEN, String(current + 1));
    } catch (error) {
      console.error('Error incrementing tidbits seen:', error);
    }
  }

  static async getDailyUnlocks() {
    try {
      const count = await AsyncStorage.getItem(KEYS.DAILY_UNLOCKS);
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      console.error('Error getting daily unlocks:', error);
      return 0;
    }
  }

  static async setDailyUnlocks(count) {
    try {
      await AsyncStorage.setItem(KEYS.DAILY_UNLOCKS, String(count));
    } catch (error) {
      console.error('Error setting daily unlocks:', error);
    }
  }

  static async getLastUnlockDate() {
    try {
      return await AsyncStorage.getItem(KEYS.LAST_UNLOCK_DATE);
    } catch (error) {
      return null;
    }
  }

  static async setLastUnlockDate(date) {
    try {
      await AsyncStorage.setItem(KEYS.LAST_UNLOCK_DATE, date);
    } catch (error) {
      console.error('Error setting last unlock date:', error);
    }
  }

  static async resetDailyStats() {
    try {
      await AsyncStorage.setItem(KEYS.DAILY_UNLOCKS, '0');
      await AsyncStorage.setItem(KEYS.DAILY_TIDBIT_COUNT, '0');
      const today = new Date().toDateString();
      await AsyncStorage.setItem(KEYS.LAST_UNLOCK_DATE, today);
      await AsyncStorage.setItem(KEYS.LAST_TIDBIT_DATE, today);
    } catch (error) {
      console.error('Error resetting daily stats:', error);
    }
  }

  static async getDailyTidbitCount() {
    try {
      const count = await AsyncStorage.getItem(KEYS.DAILY_TIDBIT_COUNT);
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      return 0;
    }
  }

  static async incrementDailyTidbitCount() {
    try {
      const current = await this.getDailyTidbitCount();
      await AsyncStorage.setItem(KEYS.DAILY_TIDBIT_COUNT, String(current + 1));
      const today = new Date().toDateString();
      await AsyncStorage.setItem(KEYS.LAST_TIDBIT_DATE, today);
    } catch (error) {
      console.error('Error incrementing daily tidbit count:', error);
    }
  }

  static async getLastTidbitDate() {
    try {
      return await AsyncStorage.getItem(KEYS.LAST_TIDBIT_DATE);
    } catch (error) {
      return null;
    }
  }

  // Notification settings
  static async getNotificationInterval() {
    try {
      const interval = await AsyncStorage.getItem(KEYS.NOTIFICATION_INTERVAL);
      return interval ? parseInt(interval, 10) : 30; // Default 30 minutes
    } catch (error) {
      console.error('Error getting notification interval:', error);
      return 30;
    }
  }

  static async setNotificationInterval(intervalMinutes) {
    try {
      await AsyncStorage.setItem(KEYS.NOTIFICATION_INTERVAL, String(intervalMinutes));
    } catch (error) {
      console.error('Error setting notification interval:', error);
    }
  }

  static async getNotificationsEnabled() {
    try {
      const enabled = await AsyncStorage.getItem(KEYS.NOTIFICATIONS_ENABLED);
      return enabled !== 'false'; // Default to true
    } catch (error) {
      console.error('Error getting notifications enabled:', error);
      return true;
    }
  }

  static async setNotificationsEnabled(enabled) {
    try {
      await AsyncStorage.setItem(KEYS.NOTIFICATIONS_ENABLED, String(enabled));
    } catch (error) {
      console.error('Error setting notifications enabled:', error);
    }
  }
}

export { StorageService };

