import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { useTheme } from '../context/ThemeContext';
import { AuthService } from '../services/AuthService';
import { StorageService } from '../services/StorageService';
import { NotificationService } from '../services/NotificationService';
import { NotificationDeckService } from '../services/NotificationDeckService';
import { ContentService } from '../services/ContentService';
import { SpacedRepetitionService } from '../services/SpacedRepetitionService';
import { ProfileService } from '../services/ProfileService';
import { getSchool } from '../config/schools';
import * as Notifications from 'expo-notifications';

const INTERVAL_OPTIONS = [
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: '4 hours', value: 240 },
];

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationInterval, setNotificationInterval] = useState(60);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState(23); // 11 PM
  const [quietHoursEnd, setQuietHoursEnd] = useState(9); // 9 AM
  const [showQuietHoursPicker, setShowQuietHoursPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [spacedRepStats, setSpacedRepStats] = useState({
    totalTidbits: 0,
    dueTidbits: 0,
    scheduledTidbits: 0,
    savedTidbits: 0,
    masteredTidbits: 0,
  });
  const [profile, setProfile] = useState(null);
  const [notificationDecks, setNotificationDecks] = useState({ classSources: [], myDecks: [] });
  const [decksLoading, setDecksLoading] = useState(false);
  const [accountBusy, setAccountBusy] = useState(false);

  useEffect(() => {
    loadSettings();
    loadSpacedRepStats();
    loadProfile();
    
    // Refresh stats when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      loadSpacedRepStats();
      loadProfile();
    });
    
    return unsubscribe;
  }, [navigation]);

  const loadProfile = async () => {
    try {
      const data = await ProfileService.getMyProfile();
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign out?',
      'You can sign back in anytime with the same Apple ID or email to restore your account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setAccountBusy(true);
            try {
              await AuthService.signOut();
            } catch (e) {
              Alert.alert('Could not sign out', e.message || 'Please try again.');
            } finally {
              setAccountBusy(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your profile, classes, decks, and progress. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              'Your account and all associated data will be permanently removed.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, delete everything',
                  style: 'destructive',
                  onPress: async () => {
                    setAccountBusy(true);
                    try {
                      await AuthService.deleteAccount();
                    } catch (e) {
                      Alert.alert(
                        'Could not delete account',
                        e.message || 'Please try again or contact support.'
                      );
                    } finally {
                      setAccountBusy(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const loadNotificationDecks = useCallback(async () => {
    setDecksLoading(true);
    try {
      await NotificationDeckService.ensureDefaultsFromEnrollment();
      const data = await NotificationDeckService.listAvailableDecks();
      setNotificationDecks({ classSources: data.classSources, myDecks: data.myDecks });
    } catch (error) {
      console.error('Error loading notification decks:', error);
    } finally {
      setDecksLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotificationDecks();
    }, [loadNotificationDecks])
  );

  const handleClassNotificationToggle = async (classId, enabled) => {
    await NotificationDeckService.toggleClassNotification(classId, enabled);
    setNotificationDecks((prev) => ({
      ...prev,
      classSources: prev.classSources.map((s) =>
        s.classId === classId ? { ...s, selected: enabled } : s
      ),
    }));
  };

  const handleDeckToggle = async (deckId, enabled) => {
    await NotificationDeckService.toggleDeck(deckId, enabled);
    setNotificationDecks((prev) => ({
      ...prev,
      myDecks: (prev.myDecks || []).map((d) =>
        d.id === deckId ? { ...d, selected: enabled } : d
      ),
    }));
  };

  const loadSpacedRepStats = async () => {
    try {
      const dueTidbits = await SpacedRepetitionService.getDueTidbits();
      const scheduledTidbits = await SpacedRepetitionService.getScheduledTidbits();
      const savedTidbits = await SpacedRepetitionService.getSavedTidbits();
      
      // Get all tidbit states to count total and mastered
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const allKeys = await AsyncStorage.getAllKeys();
      const spacedRepKeys = allKeys.filter(key => key.startsWith('spaced_repetition_'));
      
      let masteredCount = 0;
      for (const key of spacedRepKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const state = JSON.parse(data);
            if (state.masteryLevel === 'mastered') {
              masteredCount++;
            }
          }
        } catch (error) {
          // Ignore parse errors
        }
      }
      
      console.log('[DEBUG] Spaced Rep Stats:', {
        total: spacedRepKeys.length,
        due: dueTidbits.length,
        scheduled: scheduledTidbits.length,
        saved: savedTidbits.length,
        mastered: masteredCount,
      });
      
      setSpacedRepStats({
        totalTidbits: spacedRepKeys.length,
        dueTidbits: dueTidbits.length,
        scheduledTidbits: scheduledTidbits.length,
        savedTidbits: savedTidbits.length,
        masteredTidbits: masteredCount,
      });
    } catch (error) {
      console.error('Error loading spaced rep stats:', error);
    }
  };

  const loadSettings = async () => {
    const enabled = await StorageService.getNotificationsEnabled();
    const interval = await StorageService.getNotificationInterval();
    const quietHours = await StorageService.getQuietHoursEnabled();
    const quietStart = await StorageService.getQuietHoursStart();
    const quietEnd = await StorageService.getQuietHoursEnd();
    
    setNotificationsEnabled(enabled);
    setNotificationInterval(interval);
    setQuietHoursEnabled(quietHours);
    setQuietHoursStart(quietStart);
    setQuietHoursEnd(quietEnd);
    setLoading(false);
  };

  const handleToggleNotifications = async (enabled) => {
    setNotificationsEnabled(enabled);
    await StorageService.setNotificationsEnabled(enabled);
    
    // Update preferences on server (will trigger re-registration with new preferences)
    await NotificationService.registerDeviceToken();
  };

  const handleIntervalChange = async (interval) => {
    setNotificationInterval(interval);
    await StorageService.setNotificationInterval(interval);
    
    // Update preferences on server
    await NotificationService.registerDeviceToken();
  };

  const handleToggleQuietHours = async (enabled) => {
    setQuietHoursEnabled(enabled);
    await StorageService.setQuietHoursEnabled(enabled);
    
    // Update preferences on server
    await NotificationService.registerDeviceToken();
  };

  const handleQuietHoursStartChange = async (hour) => {
    setQuietHoursStart(hour);
    await StorageService.setQuietHoursStart(hour);
    
    // Update preferences on server
    await NotificationService.registerDeviceToken();
  };

  const handleQuietHoursEndChange = async (hour) => {
    setQuietHoursEnd(hour);
    await StorageService.setQuietHoursEnd(hour);
    
    // Update preferences on server
    await NotificationService.registerDeviceToken();
  };

  const formatHour = (hour) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  const handleTestNotification = async () => {
    // Send an immediate test push notification (with action buttons)
    try {
      const tidbit = await ContentService.getRandomTidbit();
      if (tidbit) {
        const success = await NotificationService.sendTestPushNotification(tidbit);
        if (success) {
          Alert.alert('Success', 'Test push notification sent! Check your notification center. Action buttons should appear when you expand it.');
        } else {
          Alert.alert('Error', 'Failed to send push notification. Check server connection and console logs.');
        }
      } else {
        Alert.alert('Error', 'Could not generate tidbit. Make sure you have categories selected.');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Could not send notification. Check if permissions are granted and server is running.');
    }
  };

  const handleTestScheduledNotification = async () => {
    // Schedule a test notification in 1 minute
    try {
      const tidbit = await ContentService.getRandomTidbit();
      if (tidbit) {
        const triggerDate = new Date();
        triggerDate.setMinutes(triggerDate.getMinutes() + 1); // 1 minute from now
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '📚 Tidbit (Test)',
            body: tidbit.text.length > 80 ? tidbit.text.substring(0, 77) + '...' : tidbit.text,
            data: {
              tidbit: JSON.stringify(tidbit),
              category: tidbit.category,
            },
            sound: true,
          },
          trigger: {
            date: triggerDate,
          },
        });
        Alert.alert('Success', 'Test scheduled notification set for 1 minute from now!');
      } else {
        Alert.alert('Error', 'Could not generate tidbit. Make sure you have categories selected.');
      }
    } catch (error) {
      console.error('Error scheduling test notification:', error);
      Alert.alert('Error', 'Could not schedule notification.');
    }
  };

  const handleCheckScheduledNotifications = async () => {
    // Check how many notifications are scheduled
    try {
      const scheduled = await NotificationService.getAllScheduledNotifications();
      console.log('[DEBUG] Scheduled notifications:', JSON.stringify(scheduled, null, 2));
      
      let firstNotificationTime = 'None';
      if (scheduled.length > 0) {
        const first = scheduled[0];
        console.log('[DEBUG] First notification trigger:', JSON.stringify(first.trigger, null, 2));
        
        // iOS converts date triggers to timeInterval triggers
        // Calculate the date from seconds (time until notification) or use hour/minute from data
        if (first.trigger && first.trigger.type === 'timeInterval' && first.trigger.seconds) {
          // Calculate date from seconds (time until notification)
          const now = new Date();
          const triggerDate = new Date(now.getTime() + first.trigger.seconds * 1000);
          firstNotificationTime = triggerDate.toLocaleString();
        } else if (first.content && first.content.data && first.content.data.hour !== undefined && first.content.data.minute !== undefined) {
          // Use hour/minute from notification data to construct time
          const now = new Date();
          const triggerDate = new Date();
          triggerDate.setHours(first.content.data.hour, first.content.data.minute, 0, 0);
          if (triggerDate < now) {
            triggerDate.setDate(triggerDate.getDate() + 1);
          }
          firstNotificationTime = triggerDate.toLocaleString();
        } else if (first.trigger && first.trigger.date) {
          firstNotificationTime = new Date(first.trigger.date).toLocaleString();
        } else {
          firstNotificationTime = 'Unable to parse date from: ' + JSON.stringify(first.trigger);
        }
      }
      
      Alert.alert(
        'Scheduled Notifications',
        `You have ${scheduled.length} notification(s) scheduled.\n\nFirst notification: ${firstNotificationTime}`
      );
    } catch (error) {
      console.error('Error checking scheduled notifications:', error);
      Alert.alert('Error', 'Could not check scheduled notifications.');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const profileInitial = (profile?.display_name || '?').trim().charAt(0).toUpperCase() || '?';
  const schoolLabel = profile?.school_id ? getSchool(profile.school_id).label : null;
  const profileSubtitle = [schoolLabel, profile?.grad_year ? `Class of ${profile.grad_year}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your account and preferences</Text>
      </View>

      <TouchableOpacity
        style={styles.profileCard}
        onPress={() => navigation.navigate('EditProfile')}
        activeOpacity={0.85}
      >
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>{profileInitial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>
            {profile?.display_name?.trim() || 'Set up your profile'}
          </Text>
          {profileSubtitle ? (
            <Text style={styles.profileSub}>{profileSubtitle}</Text>
          ) : (
            <Text style={styles.profileSub}>Add your name and school</Text>
          )}
        </View>
        <Text style={styles.profileChevron}>›</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Notifications</Text>
            <Text style={styles.settingDescription}>
              Receive tidbits via notifications
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: '#e5e7eb', true: '#6366f1' }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      {Platform.OS === 'ios' && notificationsEnabled && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notification Interval</Text>
            <Text style={styles.sectionDescription}>
              How often you'd like to receive tidbit notifications
            </Text>
            <View style={styles.intervalOptions}>
              {INTERVAL_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.intervalOption,
                    notificationInterval === option.value && styles.intervalOptionSelected,
                  ]}
                  onPress={() => handleIntervalChange(option.value)}
                >
                  <Text
                    style={[
                      styles.intervalOptionText,
                      notificationInterval === option.value && styles.intervalOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {notificationInterval === option.value && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Quiet Hours</Text>
                {quietHoursEnabled ? (
                  <Text style={styles.settingDescription}>
                    No notifications from {formatHour(quietHoursStart)} to {formatHour(quietHoursEnd)}
                  </Text>
                ) : (
                  <Text style={styles.settingDescription}>
                    No notifications during selected hours
                  </Text>
                )}
                <Text style={styles.settingSubnote}>
                  Quiet hours are applied in PST.
                </Text>
              </View>
              <Switch
                value={quietHoursEnabled}
                onValueChange={handleToggleQuietHours}
                trackColor={{ false: '#e5e7eb', true: '#6366f1' }}
                thumbColor="#ffffff"
              />
            </View>
            
            {quietHoursEnabled && (
              <View style={styles.quietHoursExpanded}>
                <TouchableOpacity
                  style={styles.expandButton}
                  onPress={() => setShowQuietHoursPicker(!showQuietHoursPicker)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.expandButtonText}>
                    {showQuietHoursPicker ? 'Hide' : 'Choose'} Quiet Hours
                  </Text>
                  <Text style={styles.expandButtonIcon}>
                    {showQuietHoursPicker ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>
                
                {showQuietHoursPicker && (
                  <View style={styles.quietHoursPicker}>
                    <View style={styles.timePickerRow}>
                      <Text style={styles.timePickerLabel}>Start:</Text>
                      <View style={styles.hourSelector}>
                        {[22, 23, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((hour) => (
                          <TouchableOpacity
                            key={hour}
                            style={[
                              styles.hourButton,
                              quietHoursStart === hour && styles.hourButtonSelected,
                            ]}
                            onPress={() => handleQuietHoursStartChange(hour)}
                          >
                            <Text
                              style={[
                                styles.hourButtonText,
                                quietHoursStart === hour && styles.hourButtonTextSelected,
                              ]}
                            >
                              {formatHour(hour)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    
                    <View style={styles.timePickerRow}>
                      <Text style={styles.timePickerLabel}>End:</Text>
                      <View style={styles.hourSelector}>
                        {[22, 23, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hour) => (
                          <TouchableOpacity
                            key={hour}
                            style={[
                              styles.hourButton,
                              quietHoursEnd === hour && styles.hourButtonSelected,
                            ]}
                            onPress={() => handleQuietHoursEndChange(hour)}
                          >
                            <Text
                              style={[
                                styles.hourButtonText,
                                quietHoursEnd === hour && styles.hourButtonTextSelected,
                              ]}
                            >
                              {formatHour(hour)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        </>
      )}

      {Platform.OS === 'android' && notificationsEnabled && (
        <View style={styles.section}>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              📱 Android: Notifications are sent when you unlock your phone
            </Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification sources</Text>
        <Text style={styles.sectionDescription}>
          Choose which enrolled classes and personal decks can appear in your tidbit notifications.
        </Text>
        {decksLoading ? (
          <Text style={styles.deckEmptyText}>Loading…</Text>
        ) : (
          <>
            {notificationDecks.classSources.length > 0 && (
              <>
                <Text style={styles.deckGroupLabel}>Class preset decks</Text>
                {notificationDecks.classSources.map((source) => (
                  <View key={source.classId} style={styles.deckRow}>
                    <Text style={styles.deckEmoji}>{source.emoji}</Text>
                    <View style={styles.deckInfo}>
                      <Text style={styles.deckTitle}>{source.title}</Text>
                      <Text style={styles.deckSub} numberOfLines={1}>
                        {source.subtitle} · {source.deckCards} card{source.deckCards === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <Switch
                      value={source.selected}
                      onValueChange={(v) => handleClassNotificationToggle(source.classId, v)}
                      trackColor={{ false: '#e5e7eb', true: theme.primary }}
                      thumbColor="#ffffff"
                    />
                  </View>
                ))}
              </>
            )}
            {notificationDecks.myDecks.length > 0 && (
              <>
                <Text style={[styles.deckGroupLabel, notificationDecks.classSources.length > 0 && { marginTop: 16 }]}>
                  My decks
                </Text>
                {notificationDecks.myDecks.map((deck) => (
                  <View key={deck.id} style={styles.deckRow}>
                    <Text style={styles.deckEmoji}>{deck.emoji}</Text>
                    <View style={styles.deckInfo}>
                      <Text style={styles.deckTitle}>{deck.title}</Text>
                      <Text style={styles.deckSub}>{deck.subtitle}</Text>
                    </View>
                    <Switch
                      value={deck.selected}
                      onValueChange={(v) => handleDeckToggle(deck.id, v)}
                      trackColor={{ false: '#e5e7eb', true: theme.primary }}
                      thumbColor="#ffffff"
                    />
                  </View>
                ))}
              </>
            )}
            {notificationDecks.classSources.length === 0 &&
              notificationDecks.myDecks.length === 0 && (
              <Text style={styles.deckEmptyText}>
                Enroll in classes on the Categories tab or create decks with cards to enable notification sources.
              </Text>
            )}
          </>
        )}
      </View>

      {/* Premium upgrade banner */}
      <TouchableOpacity
        style={styles.premiumBanner}
        onPress={() => navigation.navigate('Paywall')}
        activeOpacity={0.85}
      >
        <Text style={styles.premiumBannerEmoji}>✨</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.premiumBannerTitle}>Upgrade to Premium</Text>
          <Text style={styles.premiumBannerSub}>AI generation, analytics, themes & more</Text>
        </View>
        <Text style={styles.premiumBannerArrow}>›</Text>
      </TouchableOpacity>

      {/* Analytics shortcut */}
      <TouchableOpacity
        style={styles.analyticsBtn}
        onPress={() => navigation.navigate('Stats')}
        activeOpacity={0.85}
      >
        <Text style={styles.analyticsBtnEmoji}>📊</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.analyticsBtnTitle}>Analytics</Text>
          <Text style={styles.analyticsBtnSub}>Retention forecast, accuracy trends, study modes</Text>
        </View>
        <Text style={styles.premiumBannerArrow}>›</Text>
      </TouchableOpacity>

      {/* Theme picker entry */}
      <TouchableOpacity
        style={[styles.analyticsBtn, { marginTop: 8 }]}
        onPress={() => navigation.navigate('ThemePicker')}
        activeOpacity={0.85}
      >
        <Text style={styles.analyticsBtnEmoji}>🎨</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.analyticsBtnTitle}>App Theme</Text>
          <Text style={styles.analyticsBtnSub}>Classic, Midnight, Forest, Sunset, Ocean</Text>
        </View>
        <Text style={styles.premiumBannerArrow}>›</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <Text style={styles.sectionDescription}>
          Choose what topics you want to learn about
        </Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Categories')}
        >
          <Text style={styles.actionButtonText}>Manage Classes & Categories</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>About Notifications</Text>
          <Text style={styles.infoText}>
            {Platform.OS === 'ios' 
              ? 'Notifications are scheduled throughout the day based on your interval setting.'
              : 'Notifications are sent when you unlock your phone.'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Content</Text>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#6366f1' }]}
          onPress={async () => {
            const cleared = await ContentService.clearCache();
            if (cleared) {
              // Force refresh content
              await ContentService.refresh();
              Alert.alert(
                'Cache Cleared',
                'Content cache cleared. The app will fetch fresh data from the server. Please restart the app to see the updated content.',
                [{ text: 'OK' }]
              );
            } else {
              Alert.alert('Error', 'Failed to clear cache.');
            }
          }}
        >
          <Text style={[styles.actionButtonText, { color: '#ffffff' }]}>Clear Content Cache & Refresh</Text>
          <Text style={[styles.chevron, { color: '#ffffff' }]}>›</Text>
        </TouchableOpacity>
        <Text style={styles.sectionDescription}>
          Clear cached content and fetch fresh data from the server. Use this if categories or tidbits aren't showing up correctly.
        </Text>
      </View>

      {false && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Testing</Text>
          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestNotification}
          >
            <Text style={styles.testButtonText}>Send Test Push Notification</Text>
          </TouchableOpacity>
          <Text style={styles.testButtonDescription}>
            Send an immediate push notification with action buttons
          </Text>
        
        {Platform.OS === 'ios' && false && (
          <>
            <TouchableOpacity
              style={[styles.testButton, styles.testButtonSecondary]}
              onPress={handleCheckScheduledNotifications}
            >
              <Text style={styles.testButtonText}>Check Scheduled Notifications</Text>
            </TouchableOpacity>
            <Text style={styles.testButtonDescription}>
              See how many notifications are scheduled (check console for debug logs)
            </Text>
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: '#f59e0b', marginTop: 8 }]}
              onPress={async () => {
                try {
                  await NotificationService.cancelAllNotifications();
                  const scheduled = await NotificationService.getAllScheduledNotifications();
                  Alert.alert(
                    'Success',
                    `Cleared all local notifications.\n\nRemaining scheduled: ${scheduled.length}\n\nNote: Push notifications from the server are not affected.`
                  );
                } catch (error) {
                  console.error('Error clearing notifications:', error);
                  Alert.alert('Error', 'Could not clear notifications.');
                }
              }}
            >
              <Text style={styles.testButtonText}>Clear Old Local Notifications</Text>
            </TouchableOpacity>
            <Text style={styles.testButtonDescription}>
              Clears any old local notifications that might still be scheduled. Push notifications from the server are not affected.
            </Text>
          </>
        )}
        </View>
      )}

      {false && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔧 Spaced Repetition Debug</Text>
        <View style={styles.debugStats}>
          <View style={styles.debugStatRow}>
            <Text style={styles.debugStatLabel}>Total Tidbits with State:</Text>
            <Text style={styles.debugStatValue}>{spacedRepStats.totalTidbits}</Text>
          </View>
          <View style={styles.debugStatRow}>
            <Text style={styles.debugStatLabel}>Due for Review (Past Due):</Text>
            <Text style={styles.debugStatValue}>{spacedRepStats.dueTidbits}</Text>
          </View>
          <View style={styles.debugStatRow}>
            <Text style={styles.debugStatLabel}>Scheduled (Has nextDue):</Text>
            <Text style={styles.debugStatValue}>{spacedRepStats.scheduledTidbits}</Text>
          </View>
          <View style={styles.debugStatRow}>
            <Text style={styles.debugStatLabel}>Saved Tidbits:</Text>
            <Text style={styles.debugStatValue}>{spacedRepStats.savedTidbits}</Text>
          </View>
          <View style={styles.debugStatRow}>
            <Text style={styles.debugStatLabel}>Mastered:</Text>
            <Text style={styles.debugStatValue}>{spacedRepStats.masteredTidbits}</Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.testButton, styles.testButtonSecondary]}
          onPress={async () => {
            const dueTidbits = await SpacedRepetitionService.getDueTidbits();
            console.log('[DEBUG] Due tidbits (past due):', dueTidbits);
            Alert.alert(
              'Due Tidbits',
              `Found ${dueTidbits.length} tidbits past their due date.\n\nCheck console for IDs.`
            );
            loadSpacedRepStats();
          }}
        >
          <Text style={styles.testButtonText}>View Due Tidbits (Past Due)</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.testButton, styles.testButtonSecondary]}
          onPress={async () => {
            const scheduledTidbits = await SpacedRepetitionService.getScheduledTidbits();
            console.log('[DEBUG] Scheduled tidbits (has nextDue):', scheduledTidbits);
            Alert.alert(
              'Scheduled Tidbits',
              `Found ${scheduledTidbits.length} tidbits with a scheduled review time.\n\nCheck console for IDs.`
            );
            loadSpacedRepStats();
          }}
        >
          <Text style={styles.testButtonText}>View Scheduled Tidbits</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.testButton, styles.testButtonSecondary]}
          onPress={async () => {
            const savedTidbits = await SpacedRepetitionService.getSavedTidbits();
            console.log('[DEBUG] Saved tidbits:', savedTidbits);
            Alert.alert(
              'Saved Tidbits',
              `Found ${savedTidbits.length} saved tidbits.\n\nCheck console for IDs.`
            );
            loadSpacedRepStats();
          }}
        >
          <Text style={styles.testButtonText}>View Saved Tidbits</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: '#ef4444' }]}
          onPress={() => {
            Alert.alert(
              'Clear All Learning State',
              'This will delete all spaced repetition data. This action cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Clear All',
                  style: 'destructive',
                  onPress: async () => {
                    await SpacedRepetitionService.clearAllState();
                    Alert.alert('Success', 'All learning state cleared.');
                    loadSpacedRepStats();
                  },
                },
              ]
            );
          }}
        >
          <Text style={[styles.testButtonText, { color: '#ffffff' }]}>Clear All Learning State</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: '#6366f1' }]}
          onPress={async () => {
            const cleared = await ContentService.clearCache();
            if (cleared) {
              // Force refresh content
              await ContentService.refresh();
              Alert.alert(
                'Cache Cleared',
                'Content cache cleared. App will fetch fresh data from server. Restart the app to see changes.',
                [{ text: 'OK' }]
              );
            } else {
              Alert.alert('Error', 'Failed to clear cache.');
            }
          }}
        >
          <Text style={[styles.testButtonText, { color: '#ffffff' }]}>Clear Content Cache & Refresh</Text>
        </TouchableOpacity>
        
        <Text style={styles.testButtonDescription}>
          Use these tools to test spaced repetition features. Check console logs for detailed info.
        </Text>
      </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Classes</Text>
        <TouchableOpacity
          style={styles.classesButton}
          onPress={() => navigation.navigate('Categories')}
          activeOpacity={0.7}
        >
          <Text style={styles.classesButtonText}>View & Edit My Classes</Text>
          <Text style={styles.classesChevron}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutContent}>
          <Text style={styles.aboutText}>
            <Text style={styles.aboutLabel}>App Name:</Text> Tidbit
          </Text>
          <Text style={styles.aboutText}>
            <Text style={styles.aboutLabel}>Version:</Text> 2.0.0
          </Text>
          <Text style={styles.aboutText}>
            <Text style={styles.aboutLabel}>Description:</Text> Learn tiny things daily through bite-sized notifications and interactive learning.
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openURL('mailto:kushald@berkeley.edu?subject=Tidbit App Support')}
            activeOpacity={0.7}
          >
            <Text style={styles.aboutText}>
              <Text style={styles.aboutLabel}>Contact:</Text>{' '}
              <Text style={[styles.aboutText, { color: '#6366f1', textDecorationLine: 'underline' }]}>
                support@tidbit.app
              </Text>
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              const privacyUrl = 'https://kushaldutta.github.io/tidbit/privacy'; 
              Linking.canOpenURL(privacyUrl).then(supported => {
                if (supported) {
                  Linking.openURL(privacyUrl);
                } else {
                  Alert.alert('Error', 'Could not open privacy policy link.');
                }
              }).catch(() => {
                Alert.alert('Error', 'Could not open privacy policy link.');
              });
            }}
            activeOpacity={0.7}
            style={{ marginTop: 8 }}
          >
            <Text style={[styles.aboutText, { color: '#6366f1', textDecorationLine: 'underline' }]}>
              Privacy Policy
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity
          style={[styles.signOutButton, accountBusy && styles.accountButtonDisabled]}
          onPress={handleSignOut}
          disabled={accountBusy}
          activeOpacity={0.7}
        >
          <Text style={styles.signOutButtonText}>
            {accountBusy ? 'Please wait…' : 'Sign Out'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.accountHint}>
          Sign out on this device. Your account stays saved in the cloud.
        </Text>
        <TouchableOpacity
          style={[styles.deleteAccountButton, accountBusy && styles.accountButtonDisabled]}
          onPress={handleDeleteAccount}
          disabled={accountBusy}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteAccountButtonText}>Delete Account</Text>
        </TouchableOpacity>
        <Text style={styles.deleteAccountHint}>
          Permanently removes your account and all data. Required for App Store compliance.
        </Text>
      </View>

      {/* Dev-only reset section — only visible in Expo Go / __DEV__ builds */}
      {__DEV__ && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developer</Text>
          <TouchableOpacity
            style={styles.devResetButton}
            onPress={async () => {
              Alert.alert(
                'Reset Onboarding',
                'This will clear your profile name/school so you see the onboarding flow again on next launch.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                      const userId = AuthService.getUserId();
                      if (userId) {
                        const { error } = await supabase
                          .from('profiles')
                          .update({ display_name: null, school_id: null })
                          .eq('id', userId);
                        if (error) {
                          Alert.alert('Supabase update failed', error.message);
                          return;
                        }
                        // Also remove any existing class memberships so class selection is fresh
                        await supabase
                          .from('class_memberships')
                          .delete()
                          .eq('user_id', userId);
                      }
                      await StorageService.setOnboardingCompleted(false);
                      const syncKey = userId ? `cloud_sync_completed_v1:${userId}` : 'cloud_sync_completed_v1';
                      await AsyncStorage.removeItem(syncKey);
                      Alert.alert(
                        'Done — Force close required',
                        'Profile cleared. Now FORCE CLOSE Expo Go from the iOS app switcher, then reopen it. (Pressing R in terminal is not enough.)'
                      );
                    },
                  },
                ]
              );
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.devResetText}>Reset Onboarding (Dev Only)</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.textSecondary,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: theme.primaryLight,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.primary,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 2,
  },
  profileSub: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  profileChevron: {
    fontSize: 24,
    color: '#9ca3af',
    fontWeight: '600',
  },
  deckGroupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  deckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.primaryLight || '#eef2ff',
  },
  deckEmoji: { fontSize: 22 },
  deckInfo: { flex: 1 },
  deckTitle: { fontSize: 15, fontWeight: '600', color: theme.text },
  deckSub: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  deckEmptyText: {
    fontSize: 14,
    color: theme.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: theme.textSecondary,
    lineHeight: 20,
  },
  settingSubnote: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  intervalOptions: {
    gap: 12,
  },
  intervalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.background,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  intervalOptionSelected: {
    backgroundColor: theme.primaryLight,
    borderColor: theme.primary,
  },
  intervalOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.text,
  },
  intervalOptionTextSelected: {
    color: theme.primary,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 20,
    color: theme.primary,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: theme.primary,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1e40af',
  },
  loadingText: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
    marginTop: 50,
  },
  testButton: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  testButtonDescription: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  testButtonSecondary: {
    backgroundColor: '#8b5cf6',
    marginTop: 8,
  },
  debugStats: {
    marginBottom: 16,
  },
  debugStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  debugStatLabel: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  debugStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  premiumBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#0f0a2e', borderRadius: 16,
    padding: 18, marginHorizontal: 16, marginBottom: 8,
  },
  premiumBannerEmoji: { fontSize: 26 },
  premiumBannerTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 2 },
  premiumBannerSub: { fontSize: 13, color: '#a5b4fc' },
  premiumBannerArrow: { fontSize: 24, color: '#a5b4fc', fontWeight: '700' },
  analyticsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    marginHorizontal: 20, marginTop: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  analyticsBtnEmoji: { fontSize: 26 },
  analyticsBtnTitle: { fontSize: 15, fontWeight: '700', color: theme.text, marginBottom: 2 },
  analyticsBtnSub: { fontSize: 12, color: theme.textSecondary },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.background,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.text,
  },
  chevron: {
    fontSize: 24,
    color: '#9ca3af',
  },
  aboutContent: {
    marginTop: 8,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 24,
    color: theme.textSecondary,
    marginBottom: 8,
  },
  aboutLabel: {
    fontWeight: '600',
    color: theme.text,
  },
  quietHoursExpanded: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  expandButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.background,
    borderRadius: 8,
  },
  expandButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.primary,
  },
  expandButtonIcon: {
    fontSize: 12,
    color: theme.primary,
  },
  quietHoursPicker: {
    marginTop: 16,
  },
  timePickerRow: {
    marginBottom: 16,
  },
  timePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 8,
  },
  hourSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hourButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.background,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 70,
    alignItems: 'center',
  },
  hourButtonSelected: {
    backgroundColor: theme.primaryLight,
    borderColor: theme.primary,
  },
  hourButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.text,
  },
  hourButtonTextSelected: {
    color: theme.primary,
    fontWeight: '600',
  },
  quietHoursInfo: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  quietHoursInfoText: {
    fontSize: 13,
    color: '#1e40af',
    textAlign: 'center',
  },
  classesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.background,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  classesButtonText: { fontSize: 15, fontWeight: '500', color: theme.text },
  classesChevron: { fontSize: 20, color: '#9ca3af' },
  devResetButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  devResetText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: theme.card,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  signOutButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
  },
  accountHint: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 18,
  },
  deleteAccountButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  deleteAccountButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteAccountHint: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 8,
    lineHeight: 18,
  },
  accountButtonDisabled: {
    opacity: 0.5,
  },
});

