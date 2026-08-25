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
import { ReportService } from '../services/ReportService';
import { usePremium } from '../components/PremiumGate';
import { EntitlementService } from '../services/EntitlementService';
import { getSchool } from '../config/schools';
import { CoinService } from '../services/CoinService';
import { BuddyService } from '../services/BuddyService';
import * as Notifications from 'expo-notifications';
import { openLegalUrl, PRIVACY_URL, TERMS_URL } from '../constants/legalUrls';
import Icon from '../components/Icon';
import NavRow from '../components/NavRow';
import { spacing, radius, iconSize } from '../theme/tokens';

const INTERVAL_OPTIONS = [
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: '4 hours', value: 240 },
];

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { isPremium } = usePremium(navigation);
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
  const [expandedClassId, setExpandedClassId] = useState(null);
  const [expandedDeckId, setExpandedDeckId] = useState(null);
  const [accountBusy, setAccountBusy] = useState(false);
  const [pendingReportCount, setPendingReportCount] = useState(0);
  const [coinBalance, setCoinBalance] = useState(null);
  const [buddyRequestCount, setBuddyRequestCount] = useState(0);

  useEffect(() => {
    loadSettings();
    loadSpacedRepStats();
    loadProfile();
    CoinService.getBalance().then(setCoinBalance).catch(() => {});
    BuddyService.getPendingRequests()
      .then((reqs) => setBuddyRequestCount(reqs.length))
      .catch(() => {});
    
    // Refresh stats when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      loadSpacedRepStats();
      loadProfile();
      loadPendingReportCount();
      CoinService.getBalance().then(setCoinBalance).catch(() => {});
      BuddyService.getPendingRequests()
        .then((reqs) => setBuddyRequestCount(reqs.length))
        .catch(() => {});
    });
    
    return unsubscribe;
  }, [navigation]);

  const loadPendingReportCount = async () => {
    try {
      const count = await ReportService.getPendingReportCount();
      setPendingReportCount(count);
    } catch {
      setPendingReportCount(0);
    }
  };

  const loadProfile = async () => {
    try {
      const data = await ProfileService.getMyProfile();
      setProfile(data);
      if (data?.is_moderator) {
        loadPendingReportCount();
      } else {
        setPendingReportCount(0);
      }
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
    const data = await NotificationDeckService.listAvailableDecks();
    setNotificationDecks({ classSources: data.classSources, myDecks: data.myDecks });
    if (!enabled && expandedClassId === classId) {
      setExpandedClassId(null);
    }
  };

  const handleSectionNotificationToggle = async (deckId, sectionId, enabled) => {
    await NotificationDeckService.toggleSectionNotification(deckId, sectionId, enabled);
    const data = await NotificationDeckService.listAvailableDecks();
    setNotificationDecks({ classSources: data.classSources, myDecks: data.myDecks });
  };

  const handleUncategorizedNotificationToggle = async (deckId, enabled) => {
    await NotificationDeckService.toggleUncategorizedNotification(deckId, enabled);
    const data = await NotificationDeckService.listAvailableDecks();
    setNotificationDecks({ classSources: data.classSources, myDecks: data.myDecks });
  };

  const toggleClassSectionsExpanded = (classId) => {
    setExpandedClassId((prev) => (prev === classId ? null : classId));
  };

  const toggleDeckSectionsExpanded = (deckId) => {
    setExpandedDeckId((prev) => (prev === deckId ? null : deckId));
  };

  const handleDeckToggle = async (deckId, enabled) => {
    await NotificationDeckService.toggleDeck(deckId, enabled);
    const data = await NotificationDeckService.listAvailableDecks();
    setNotificationDecks({ classSources: data.classSources, myDecks: data.myDecks });
    if (!enabled && expandedDeckId === deckId) {
      setExpandedDeckId(null);
    }
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

  const handlePremiumPress = () => {
    if (isPremium) {
      Alert.alert('Your Premium Plan', undefined, [
        {
          text: 'Manage Subscription',
          onPress: () => EntitlementService.showManageSubscriptions(),
        },
        {
          text: 'View Premium Features',
          onPress: () => navigation.navigate('Paywall', { source: 'settings_manage' }),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      navigation.navigate('Paywall', { source: 'settings' });
    }
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
        <Text style={styles.subtitle}>Notifications, profile, and account</Text>
      </View>

      <NavRow
        title={profile?.display_name?.trim() || 'Set up your profile'}
        sub={profileSubtitle || 'Add your name and school'}
        onPress={() => navigation.navigate('EditProfile')}
        leading={
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{profileInitial}</Text>
          </View>
        }
      />

      <NavRow
        icon="coins"
        title={coinBalance == null ? 'Study Coins' : `${coinBalance} Study Coins`}
        sub="Balance, earnings, and the shop"
        onPress={() => navigation.navigate('CoinWallet')}
        tone="warn"
      />

      <NavRow
        icon="buddy"
        title="Buddy requests"
        sub={
          buddyRequestCount > 0
            ? `${buddyRequestCount} waiting — accept or decline`
            : 'Incoming study-buddy invites'
        }
        onPress={() => navigation.navigate('BuddyRequests')}
        badge={buddyRequestCount}
      />

      {/* One notification group, not three stacked cards: the master switch and
          everything it gates belong to the same decision. */}
      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Notifications</Text>
            <Text style={styles.settingDescription}>
              Push tidbits to your lock screen
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: theme.borderStrong, true: theme.primary }}
            thumbColor="#ffffff"
          />
        </View>

        {Platform.OS === 'ios' && notificationsEnabled && (
          <>
            <View style={styles.divider} />

            <Text style={styles.subsectionTitle}>Interval</Text>
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
                    <Icon name="check" size={iconSize.md} color={theme.primary} filled />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Quiet Hours</Text>
                <Text style={styles.settingDescription}>
                  {quietHoursEnabled
                    ? `No notifications from ${formatHour(quietHoursStart)} to ${formatHour(quietHoursEnd)}, PST`
                    : 'Mute notifications overnight'}
                </Text>
              </View>
              <Switch
                value={quietHoursEnabled}
                onValueChange={handleToggleQuietHours}
                trackColor={{ false: theme.borderStrong, true: theme.primary }}
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
                  <Icon
                    name={showQuietHoursPicker ? 'collapse' : 'expand'}
                    size={iconSize.sm}
                    color={theme.primary}
                  />
                </TouchableOpacity>

                {showQuietHoursPicker && (
                  <View style={styles.quietHoursPicker}>
                    <View style={styles.timePickerRow}>
                      <Text style={styles.timePickerLabel}>Start</Text>
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
                      <Text style={styles.timePickerLabel}>End</Text>
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
          </>
        )}

        {Platform.OS === 'android' && notificationsEnabled && (
          <>
            <View style={styles.divider} />
            <View style={styles.infoBox}>
              <Icon name="info" size={iconSize.md} color={theme.info} style={styles.infoIcon} />
              <Text style={styles.infoText}>
                On Android, notifications arrive when you unlock your phone.
              </Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification sources</Text>
        <Text style={styles.sectionDescription}>
          Classes and decks that can show up in notifications.
        </Text>
        {decksLoading ? (
          <Text style={styles.deckEmptyText}>Loading…</Text>
        ) : (
          <>
            {notificationDecks.classSources.length > 0 && (
              <>
                <Text style={styles.deckGroupLabel}>Class preset decks</Text>
                {notificationDecks.classSources.map((source) => {
                  const sectionsExpanded = expandedClassId === source.classId;
                  const activeSections = (source.sections || []).filter((s) => s.hasCards);
                  const showSections =
                    source.hasSections &&
                    source.selected &&
                    (activeSections.length > 0 || source.uncategorizedCount > 0);
                  return (
                    <View key={source.classId}>
                      <View style={styles.deckRow}>
                        <Text style={styles.deckEmoji}>{source.emoji}</Text>
                        <View style={styles.deckInfo}>
                          <Text style={styles.deckTitle}>{source.title}</Text>
                          <Text style={styles.deckSub} numberOfLines={1}>
                            {source.subtitle} · {source.deckCards} card{source.deckCards === 1 ? '' : 's'}
                          </Text>
                        </View>
                        {showSections && (
                          <TouchableOpacity
                            style={styles.sectionExpandBtn}
                            onPress={() => toggleClassSectionsExpanded(source.classId)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={styles.sectionExpandText}>Sections</Text>
                            <Icon
                              name={sectionsExpanded ? 'collapse' : 'expand'}
                              size={iconSize.sm}
                              color={theme.primary}
                            />
                          </TouchableOpacity>
                        )}
                        <Switch
                          value={source.selected}
                          onValueChange={(v) => handleClassNotificationToggle(source.classId, v)}
                          trackColor={{ false: theme.borderStrong, true: theme.primary }}
                          thumbColor="#ffffff"
                        />
                      </View>
                      {showSections && sectionsExpanded && (
                        <View style={styles.sectionList}>
                          {activeSections.map((section) => (
                            <View key={section.id} style={styles.sectionRow}>
                              <View style={styles.sectionInfo}>
                                <Text style={styles.deckSectionTitle}>{section.title}</Text>
                                <Text style={styles.sectionSub} numberOfLines={1}>
                                  {section.cardCount} card{section.cardCount === 1 ? '' : 's'}
                                </Text>
                              </View>
                              <Switch
                                value={section.selected}
                                onValueChange={(v) =>
                                  handleSectionNotificationToggle(source.deckId, section.id, v)
                                }
                                trackColor={{ false: theme.borderStrong, true: theme.primary }}
                                thumbColor="#ffffff"
                              />
                            </View>
                          ))}
                          {source.uncategorizedCount > 0 && (
                            <View style={styles.sectionRow}>
                              <View style={styles.sectionInfo}>
                                <Text style={styles.deckSectionTitle}>Uncategorized</Text>
                                <Text style={styles.sectionSub} numberOfLines={1}>
                                  {source.uncategorizedCount} card{source.uncategorizedCount === 1 ? '' : 's'}
                                </Text>
                              </View>
                              <Switch
                                value={source.uncategorizedSelected}
                                onValueChange={(v) =>
                                  handleUncategorizedNotificationToggle(source.deckId, v)
                                }
                                trackColor={{ false: theme.borderStrong, true: theme.primary }}
                                thumbColor="#ffffff"
                              />
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            )}
            {notificationDecks.myDecks.length > 0 && (
              <>
                <Text style={[styles.deckGroupLabel, notificationDecks.classSources.length > 0 && { marginTop: 16 }]}>
                  My decks
                </Text>
                {notificationDecks.myDecks.map((deck) => {
                  const sectionsExpanded = expandedDeckId === deck.id;
                  const activeSections = (deck.sections || []).filter((s) => s.hasCards);
                  const showSections =
                    deck.hasSections &&
                    deck.selected &&
                    (activeSections.length > 0 || deck.uncategorizedCount > 0);
                  return (
                    <View key={deck.id}>
                      <View style={styles.deckRow}>
                        <Text style={styles.deckEmoji}>{deck.emoji}</Text>
                        <View style={styles.deckInfo}>
                          <Text style={styles.deckTitle}>{deck.title}</Text>
                          <Text style={styles.deckSub}>{deck.subtitle}</Text>
                        </View>
                        {showSections && (
                          <TouchableOpacity
                            style={styles.sectionExpandBtn}
                            onPress={() => toggleDeckSectionsExpanded(deck.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={styles.sectionExpandText}>Sections</Text>
                            <Icon
                              name={sectionsExpanded ? 'collapse' : 'expand'}
                              size={iconSize.sm}
                              color={theme.primary}
                            />
                          </TouchableOpacity>
                        )}
                        <Switch
                          value={deck.selected}
                          onValueChange={(v) => handleDeckToggle(deck.id, v)}
                          trackColor={{ false: theme.borderStrong, true: theme.primary }}
                          thumbColor="#ffffff"
                        />
                      </View>
                      {showSections && sectionsExpanded && (
                        <View style={styles.sectionList}>
                          {activeSections.map((section) => (
                            <View key={section.id} style={styles.sectionRow}>
                              <View style={styles.sectionInfo}>
                                <Text style={styles.deckSectionTitle}>{section.title}</Text>
                                <Text style={styles.sectionSub} numberOfLines={1}>
                                  {section.cardCount} card{section.cardCount === 1 ? '' : 's'}
                                </Text>
                              </View>
                              <Switch
                                value={section.selected}
                                onValueChange={(v) =>
                                  handleSectionNotificationToggle(deck.deckId, section.id, v)
                                }
                                trackColor={{ false: theme.borderStrong, true: theme.primary }}
                                thumbColor="#ffffff"
                              />
                            </View>
                          ))}
                          {deck.uncategorizedCount > 0 && (
                            <View style={styles.sectionRow}>
                              <View style={styles.sectionInfo}>
                                <Text style={styles.deckSectionTitle}>Uncategorized</Text>
                                <Text style={styles.sectionSub} numberOfLines={1}>
                                  {deck.uncategorizedCount} card{deck.uncategorizedCount === 1 ? '' : 's'}
                                </Text>
                              </View>
                              <Switch
                                value={deck.uncategorizedSelected}
                                onValueChange={(v) =>
                                  handleUncategorizedNotificationToggle(deck.deckId, v)
                                }
                                trackColor={{ false: theme.borderStrong, true: theme.primary }}
                                thumbColor="#ffffff"
                              />
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            )}
            {notificationDecks.classSources.length === 0 &&
              notificationDecks.myDecks.length === 0 && (
              <Text style={styles.deckEmptyText}>
                Enroll in a class or create a deck to pick notification sources.
              </Text>
            )}
          </>
        )}
      </View>

      <NavRow
        icon="ai"
        title={isPremium ? 'View Your Plan' : 'Upgrade to Premium'}
        sub={
          isPremium
            ? 'Manage or cancel your subscription'
            : 'AI generation, analytics, themes & more'
        }
        onPress={handlePremiumPress}
        tone="accent"
      />

      <NavRow
        icon="stats"
        title="Analytics"
        sub="Retention forecast, accuracy trends, study modes"
        onPress={() => navigation.navigate('Stats')}
      />

      <NavRow
        icon="palette"
        title="App Theme"
        sub="Classic is free · Sunset with coins"
        onPress={() => navigation.navigate('ThemePicker')}
      />

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
        </View>
      )}

      {false && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spaced Repetition Debug</Text>
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
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>
          Study with your class — course-native flashcards, daily challenges, and
          classmates in the same lecture.
        </Text>
        <Text style={styles.aboutVersion}>Tidbit 2.3.1</Text>
        <TouchableOpacity
          onPress={() => Linking.openURL('mailto:kushald@berkeley.edu?subject=Tidbit App Support')}
          activeOpacity={0.7}
        >
          <Text style={styles.aboutLink}>Contact support</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => openLegalUrl(PRIVACY_URL, 'Privacy Policy')}
          activeOpacity={0.7}
        >
          <Text style={styles.aboutLink}>Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => openLegalUrl(TERMS_URL, 'Terms of Service')}
          activeOpacity={0.7}
        >
          <Text style={styles.aboutLink}>Terms of Service</Text>
        </TouchableOpacity>
      </View>

      {profile?.is_moderator && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Moderation</Text>
          <TouchableOpacity
            style={styles.moderationQueueBtn}
            onPress={() => navigation.navigate('ModerationReports')}
            activeOpacity={0.7}
          >
            <View style={styles.moderationQueueRow}>
              <Text style={styles.moderationQueueText}>Review reports</Text>
              {pendingReportCount > 0 && (
                <View style={styles.reportBadge}>
                  <Text style={styles.reportBadgeText}>{pendingReportCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.moderationQueueHint}>
              User-submitted reports waiting for review
            </Text>
          </TouchableOpacity>
        </View>
      )}

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
          Permanently removes your account and all of its data.
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
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: theme.textSecondary,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: theme.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  profileAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.primary,
  },

  // ─── Sections ───────────────────────────────────────────────────────────
  section: {
    backgroundColor: theme.card,
    borderRadius: radius.md,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.lg,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 19,
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: spacing.lg,
  },
  subsectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: spacing.sm,
  },

  // ─── Notification interval ──────────────────────────────────────────────
  intervalOptions: {
    gap: spacing.sm,
  },
  intervalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.sm,
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  intervalOptionSelected: {
    backgroundColor: theme.primaryLight,
    borderColor: theme.primary,
  },
  intervalOptionText: {
    fontSize: 15,
    color: theme.text,
  },
  intervalOptionTextSelected: {
    color: theme.primary,
    fontWeight: '600',
  },

  // ─── Quiet hours ────────────────────────────────────────────────────────
  quietHoursExpanded: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  expandButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: theme.surfaceAlt,
    borderRadius: radius.sm,
  },
  expandButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.primary,
  },
  quietHoursPicker: {
    marginTop: spacing.lg,
  },
  timePickerRow: {
    marginBottom: spacing.lg,
  },
  timePickerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: spacing.sm,
  },
  hourSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  hourButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
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
    color: theme.text,
  },
  hourButtonTextSelected: {
    color: theme.primary,
    fontWeight: '600',
  },

  // ─── Notification sources ───────────────────────────────────────────────
  deckGroupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  deckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  // Deck cover emoji are user-chosen content, not UI icons — they stay emoji.
  deckEmoji: { fontSize: 22 },
  deckInfo: { flex: 1 },
  deckTitle: { fontSize: 15, fontWeight: '600', color: theme.text },
  deckSub: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  sectionExpandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginRight: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  sectionExpandText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.primary,
  },
  sectionList: {
    marginLeft: spacing.xxxl + spacing.xs,
    marginBottom: spacing.xs,
    borderLeftWidth: 2,
    borderLeftColor: theme.border,
    paddingLeft: spacing.md,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  sectionInfo: { flex: 1 },
  deckSectionTitle: { fontSize: 13, fontWeight: '600', color: theme.text },
  sectionSub: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  deckEmptyText: {
    fontSize: 13,
    color: theme.textMuted,
    lineHeight: 19,
  },

  // ─── About ──────────────────────────────────────────────────────────────
  aboutText: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.textSecondary,
  },
  aboutVersion: {
    fontSize: 13,
    color: theme.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  aboutLink: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.primary,
    paddingVertical: spacing.sm,
  },

  // ─── Moderation ─────────────────────────────────────────────────────────
  moderationQueueBtn: {
    backgroundColor: theme.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  moderationQueueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moderationQueueText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
  },
  moderationQueueHint: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: spacing.xs,
  },
  reportBadge: {
    backgroundColor: theme.danger,
    borderRadius: radius.pill,
    minWidth: 24,
    height: 24,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  // ─── Account ────────────────────────────────────────────────────────────
  signOutButton: {
    backgroundColor: theme.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  signOutButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
  },
  accountHint: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  deleteAccountButton: {
    backgroundColor: theme.dangerBg,
    borderWidth: 1,
    borderColor: theme.danger,
    borderRadius: radius.sm,
    padding: spacing.md + 2,
    alignItems: 'center',
  },
  deleteAccountButtonText: {
    color: theme.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteAccountHint: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  accountButtonDisabled: {
    opacity: 0.5,
  },
  devResetButton: {
    backgroundColor: theme.dangerBg,
    borderWidth: 1,
    borderColor: theme.danger,
    borderRadius: radius.sm,
    padding: spacing.md + 2,
    alignItems: 'center',
  },
  devResetText: {
    color: theme.danger,
    fontSize: 14,
    fontWeight: '600',
  },

  // ─── Shared / misc ──────────────────────────────────────────────────────
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.infoBg,
    borderRadius: radius.sm,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.info,
  },
  infoIcon: { marginRight: spacing.md },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: theme.infoText,
  },
  loadingText: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
    marginTop: 50,
  },

  // ─── Debug tools (behind `{false && …}`) ─────────────────────────────────
  testButton: {
    backgroundColor: theme.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.sm,
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
    marginBottom: spacing.md,
  },
  testButtonSecondary: {
    backgroundColor: theme.primaryDark,
    marginTop: spacing.sm,
  },
  debugStats: {
    marginBottom: spacing.lg,
  },
  debugStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
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
});
