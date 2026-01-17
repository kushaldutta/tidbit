import { StorageService } from './StorageService';

const MIN_UNLOCK_INTERVAL = 30000; // 30 seconds minimum between tidbits

class UnlockService {
  static lastUnlockTime = null;
  static isInitialized = false;

  static async init() {
    if (this.isInitialized) return;
    
    // Reset daily stats if it's a new day
    await this.checkAndResetDailyStats();
    this.isInitialized = true;
  }

  static async checkAndResetDailyStats() {
    try {
      const lastDate = await StorageService.getLastTidbitDate();
      const today = new Date().toDateString();
      
      if (lastDate !== today) {
        await StorageService.resetDailyStats();
      }
    } catch (error) {
      console.error('Error checking daily stats:', error);
    }
  }

  static async shouldShowTidbit() {
    await this.checkAndResetDailyStats();

    // Check minimum interval
    const now = Date.now();
    if (this.lastUnlockTime && (now - this.lastUnlockTime) < MIN_UNLOCK_INTERVAL) {
      return false;
    }

    // Check if user has selected categories
    const categories = await StorageService.getSelectedCategories();
    if (categories.length === 0) {
      return false;
    }

    return true;
  }

  static async recordUnlock() {
    this.lastUnlockTime = Date.now();
    await StorageService.incrementDailyTidbitCount();
    
    const dailyUnlocks = await StorageService.getDailyUnlocks();
    await StorageService.setDailyUnlocks(dailyUnlocks + 1);
    
    const today = new Date().toDateString();
    await StorageService.setLastUnlockDate(today);
  }
}

export { UnlockService };

