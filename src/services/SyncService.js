import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';
import { ProfileService } from './ProfileService';
import { ClassService } from './ClassService';
import { StorageService } from './StorageService';

const SYNCED_FLAG_PREFIX = 'cloud_sync_completed_v1';

/**
 * Keeps device-local prefs aligned with the Supabase user account so the same
 * Apple / email login is the same account on every device.
 */
class SyncService {
  static _syncedForUserId = null;

  static resetSyncCache() {
    this._syncedForUserId = null;
  }

  static syncedFlagKey(userId) {
    return `${SYNCED_FLAG_PREFIX}:${userId}`;
  }

  static isOnboardingCompleteInCloud(profile) {
    return profile?.notification_settings?.onboarding_completed === true;
  }

  /** Legacy accounts or anyone with meaningful cloud state — skip setup on re-login. */
  static async isFullyOnboarded(profile) {
    if (!profile?.display_name || !profile?.school_id) return false;
    if (this.isOnboardingCompleteInCloud(profile)) return true;
    if (profile?.notification_settings?.onboarding_completed === false) return false;

    const settings = profile?.notification_settings || {};
    const userId = profile.id || AuthService.getUserId();

    if (settings.interval_minutes != null) {
      await this.markOnboardingCompleteInCloud(userId, settings);
      return true;
    }

    if (
      Array.isArray(settings.legacy_selected_categories) &&
      settings.legacy_selected_categories.length > 0
    ) {
      await this.markOnboardingCompleteInCloud(userId, settings);
      return true;
    }

    const classIds = await ClassService.getMyClassIds();
    if (classIds.length > 0) {
      await this.markOnboardingCompleteInCloud(userId, settings);
      return true;
    }

    const { data: stats } = await supabase
      .from('user_stats')
      .select('tidbits_seen')
      .eq('user_id', userId)
      .maybeSingle();
    if (stats?.tidbits_seen > 0) {
      await this.markOnboardingCompleteInCloud(userId, settings);
      return true;
    }

    const alreadySynced = await AsyncStorage.getItem(this.syncedFlagKey(userId));
    if (alreadySynced === 'true') {
      await this.markOnboardingCompleteInCloud(userId, settings);
      return true;
    }

    return false;
  }

  static async markOnboardingCompleteInCloud(userId, existingSettings = {}) {
    if (!userId) return;
    const { error } = await supabase
      .from('profiles')
      .update({
        notification_settings: {
          ...existingSettings,
          onboarding_completed: true,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    if (error) console.warn('[SYNC] markOnboardingCompleteInCloud failed:', error.message);
  }

  /**
   * Call after every successful auth (app launch + sign-in).
   * Fully onboarded users: pull cloud state and skip setup.
   * Mid-onboarding users: keep setup flow; do not mark onboarding done.
   */
  static async onAuthenticated() {
    if (!SUPABASE_CONFIGURED || !AuthService.isAuthenticated()) return false;

    const userId = AuthService.getUserId();
    if (!userId) return false;

    if (this._syncedForUserId === userId) return true;

    try {
      const profile = await ProfileService.getMyProfile();
      const onboardingDone = await this.isFullyOnboarded(profile);

      if (onboardingDone) {
        await this.hydrateFromCloud(profile);
        await StorageService.setOnboardingCompleted(true);
        await AsyncStorage.setItem(this.syncedFlagKey(userId), 'true');

        const classIds = await ClassService.getMyClassIds();
        if (classIds.length > 0) {
          await ClassService.replaceCategoriesToEnrollment(classIds);
        }
      } else {
        // Profile may exist mid-setup — never skip class selection / permissions.
        await StorageService.setOnboardingCompleted(false);

        const hasPartialProfile = Boolean(profile?.display_name && profile?.school_id);
        if (!hasPartialProfile) {
          const localOnboardingDone = await StorageService.getOnboardingCompleted();
          if (localOnboardingDone) {
            await this.pushLegacyLocalStateIfNeeded(userId);
          }
        }
      }

      await this.linkDeviceTokenIfRegistered();
      this._syncedForUserId = userId;
      return true;
    } catch (err) {
      console.error('[SYNC] onAuthenticated failed:', err);
      return false;
    }
  }

  /** Mark onboarding finished locally and in the cloud (PermissionRequest screen). */
  static async completeOnboarding() {
    await StorageService.setOnboardingCompleted(true);
    this.resetSyncCache();

    const userId = AuthService.getUserId();
    if (!userId) return;

    const profile = await ProfileService.getMyProfile();
    const existing = profile?.notification_settings || {};

    const { error } = await supabase
      .from('profiles')
      .update({
        notification_settings: {
          ...existing,
          onboarding_completed: true,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;

    await AsyncStorage.setItem(this.syncedFlagKey(userId), 'true');
    await this.syncProfilePreferences();
    await this.syncUserStats();
  }

  /** @deprecated Use onAuthenticated() */
  static async syncIfNeeded() {
    return this.onAuthenticated();
  }

  /**
   * Pull server-side account state onto this device.
   */
  static async hydrateFromCloud(profile) {
    const userId = profile?.id || AuthService.getUserId();
    if (!userId) return;

    const settings = profile?.notification_settings || {};

    if (settings.interval_minutes != null) {
      await StorageService.setNotificationInterval(settings.interval_minutes);
    }
    if (typeof settings.enabled === 'boolean') {
      await StorageService.setNotificationsEnabled(settings.enabled);
    }
    if (Array.isArray(settings.selected_deck_ids)) {
      await StorageService.setSelectedDeckIds(settings.selected_deck_ids);
    }
    if (Array.isArray(settings.notification_disabled_categories)) {
      await StorageService.setNotificationDisabledCategories(
        settings.notification_disabled_categories
      );
    }
    if (Array.isArray(settings.legacy_selected_categories)) {
      await StorageService.setSelectedCategories(settings.legacy_selected_categories);
    }
    const qh = settings.quiet_hours;
    if (qh) {
      if (typeof qh.enabled === 'boolean') {
        await StorageService.setQuietHoursEnabled(qh.enabled);
      }
      if (qh.start != null) await StorageService.setQuietHoursStart(qh.start);
      if (qh.end != null) await StorageService.setQuietHoursEnd(qh.end);
    }

    const { data: stats } = await supabase
      .from('user_stats')
      .select('tidbits_seen, cards_mastered')
      .eq('user_id', userId)
      .maybeSingle();

    if (stats?.tidbits_seen != null) {
      const local = await StorageService.getTidbitsSeen();
      await StorageService.setTidbitsSeen(Math.max(local, stats.tidbits_seen));
    }

    if (profile?.theme) {
      await AsyncStorage.setItem('@tidbit:app_theme', profile.theme).catch(() => {});
    }

    console.log('[SYNC] Hydrated account state from cloud for user', userId);
  }

  /**
   * First login on this device for a new account — upload legacy AsyncStorage once.
   */
  static async pushLegacyLocalStateIfNeeded(userId) {
    const flagKey = this.syncedFlagKey(userId);
    const alreadySynced = await AsyncStorage.getItem(flagKey);
    if (alreadySynced === 'true') return false;

    try {
      await this.syncProfilePreferences();
      await this.syncUserStats();
      await AsyncStorage.setItem(flagKey, 'true');
      console.log('[SYNC] Legacy local state pushed to cloud');
      return true;
    } catch (err) {
      console.error('[SYNC] pushLegacyLocalStateIfNeeded failed:', err);
      return false;
    }
  }

  static async syncProfilePreferences() {
    const userId = AuthService.getUserId();
    if (!userId) return;

    const profile = await ProfileService.getMyProfile();
    const existing = profile?.notification_settings || {};

    const [
      notificationInterval,
      notificationsEnabled,
      quietHoursEnabled,
      quietHoursStart,
      quietHoursEnd,
      selectedCategories,
      selectedDeckIds,
      notificationDisabledCategories,
      savedTheme,
    ] = await Promise.all([
      StorageService.getNotificationInterval(),
      StorageService.getNotificationsEnabled(),
      StorageService.getQuietHoursEnabled(),
      StorageService.getQuietHoursStart(),
      StorageService.getQuietHoursEnd(),
      StorageService.getSelectedCategories(),
      StorageService.getSelectedDeckIds(),
      StorageService.getNotificationDisabledCategories(),
      AsyncStorage.getItem('@tidbit:app_theme'),
    ]);

    const notification_settings = {
      ...existing,
      interval_minutes: notificationInterval,
      enabled: notificationsEnabled,
      quiet_hours: {
        enabled: quietHoursEnabled,
        start: quietHoursStart,
        end: quietHoursEnd,
      },
      legacy_selected_categories: selectedCategories,
      selected_deck_ids: selectedDeckIds,
      notification_disabled_categories: notificationDisabledCategories,
    };

    const theme = savedTheme || profile?.theme || 'default';

    const { error } = await supabase
      .from('profiles')
      .update({
        notification_settings,
        theme,
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

  static async linkDeviceTokenIfRegistered() {
    const pushToken = await StorageService.getItem('push_token');
    if (pushToken) {
      await this.linkDeviceTokenToUser(pushToken);
    }
  }

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

  /**
   * Clear device-local session cache on sign-out so the next login does not
   * inherit another account's onboarding / category picks.
   */
  static async clearLocalSessionState() {
    await StorageService.setOnboardingCompleted(false);
    await StorageService.setSelectedCategories([]);
    await StorageService.setSelectedDeckIds([]);
    await StorageService.setNotificationDisabledCategories([]);
    await StorageService.setNotificationsEnabled(true);
    await StorageService.setNotificationInterval(60);
    await StorageService.setQuietHoursEnabled(false);
    await AsyncStorage.setItem('@tidbit:app_theme', 'default').catch(() => {});
  }
}

export { SyncService };
export default SyncService;
