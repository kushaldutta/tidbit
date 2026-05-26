import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';
import { StorageService } from './StorageService';

const SYNCED_FLAG = 'cloud_sync_completed_v1';

/**
 * One-way sync of legacy AsyncStorage-only state into the cloud the first
 * time a user logs in. Idempotent: stops after a successful run.
 *
 * What we sync up:
 *  - notification preferences (interval, enabled, quiet hours)
 *  - selected categories
 *  - aggregate stats (tidbits seen, daily counts)
 *
 * What we do NOT sync (yet):
 *  - per-card spaced-repetition state (lives in legacy
 *    SpacedRepetitionService format; migrated in W3 when decks/cards exist)
 */
class SyncService {
  static async syncIfNeeded() {
    if (!SUPABASE_CONFIGURED) return false;
    if (!AuthService.isAuthenticated()) return false;

    const alreadySynced = await AsyncStorage.getItem(SYNCED_FLAG);
    if (alreadySynced === 'true') return false;

    try {
      await this.syncProfilePreferences();
      await this.syncUserStats();
      await AsyncStorage.setItem(SYNCED_FLAG, 'true');
      console.log('[SYNC] Legacy state synced to cloud');
      return true;
    } catch (err) {
      console.error('[SYNC] Cloud sync failed (will retry on next launch):', err);
      return false;
    }
  }

  static async syncProfilePreferences() {
    const userId = AuthService.getUserId();
    if (!userId) return;

    const [
      notificationInterval,
      notificationsEnabled,
      quietHoursEnabled,
      quietHoursStart,
      quietHoursEnd,
      selectedCategories,
    ] = await Promise.all([
      StorageService.getNotificationInterval(),
      StorageService.getNotificationsEnabled(),
      StorageService.getQuietHoursEnabled(),
      StorageService.getQuietHoursStart(),
      StorageService.getQuietHoursEnd(),
      StorageService.getSelectedCategories(),
    ]);

    const notification_settings = {
      interval_minutes: notificationInterval,
      enabled: notificationsEnabled,
      quiet_hours: {
        enabled: quietHoursEnabled,
        start: quietHoursStart,
        end: quietHoursEnd,
      },
      legacy_selected_categories: selectedCategories,
    };

    const { error } = await supabase
      .from('profiles')
      .update({
        notification_settings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    if (error) throw error;
  }

  static async syncUserStats() {
    const userId = AuthService.getUserId();
    if (!userId) return;

    const tidbitsSeen = await StorageService.getTidbitsSeen();

    const row = {
      user_id: userId,
      tidbits_seen: tidbitsSeen || 0,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('user_stats')
      .upsert(row, { onConflict: 'user_id' });
    if (error) throw error;
  }

  // Link the existing push-notification device token to the now-authenticated
  // user (backfill of device_tokens.user_id added in W2 migration).
  static async linkDeviceTokenToUser(pushToken) {
    if (!SUPABASE_CONFIGURED || !pushToken) return;
    const userId = AuthService.getUserId();
    if (!userId) return;

    const { error } = await supabase
      .from('device_tokens')
      .update({ user_id: userId })
      .eq('token', pushToken);
    if (error) {
      console.warn('[SYNC] linkDeviceTokenToUser failed:', error.message);
    }
  }
}

export { SyncService };
export default SyncService;
