import React, { useState, useEffect } from 'react';
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
import { StorageService } from '../services/StorageService';
import { NotificationService } from '../services/NotificationService';
import { ContentService } from '../services/ContentService';
import { SpacedRepetitionService } from '../services/SpacedRepetitionService';
import * as Notifications from 'expo-notifications';

const INTERVAL_OPTIONS = [
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: '4 hours', value: 240 },
];

export default function SettingsScreen({ navigation }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationInterval, setNotificationInterval] = useState(60);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState(23); // 11 PM
  const [quietHoursEnd, setQuietHoursEnd] = useState(9); // 9 AM
  const [showQuietHoursPicker, setShowQuietHoursPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [devModeEnabled, setDevModeEnabled] = useState(false);
  const [devModeTapCount, setDevModeTapCount] = useState(0);
  const [spacedRepStats, setSpacedRepStats] = useState({
    totalTidbits: 0,
    dueTidbits: 0,
    scheduledTidbits: 0,
    savedTidbits: 0,
    masteredTidbits: 0,
  });

  useEffect(() => {
    loadSettings();
    loadSpacedRepStats();
    loadDevMode();
    
    // Refresh stats when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      loadSpacedRepStats();
    });
    
    return unsubscribe;
  }, [navigation]);

  const loadDevMode = async () => {
    const enabled = await StorageService.getDevModeEnabled();
    setDevModeEnabled(enabled);
  };

  const handleDevModeToggle = async () => {
    const newState = !devModeEnabled;
    setDevModeEnabled(newState);
    await StorageService.setDevModeEnabled(newState);
    if (newState) {
      Alert.alert('🔧 Dev Mode', 'Developer mode enabled. Debug tools are now visible.');
    } else {
      Alert.alert('🔧 Dev Mode', 'Developer mode disabled.');
    }
  };

  const handleSecretTap = () => {
    const newCount = devModeTapCount + 1;
    setDevModeTapCount(newCount);
    
    // Reset after 3 seconds
    setTimeout(() => {
      setDevModeTapCount(0);
    }, 3000);
    
    // Enable dev mode after 5 taps
    if (newCount >= 5) {
      handleDevModeToggle();
      setDevModeTapCount(0);
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your notification preferences</Text>
      </View>

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
        <Text style={styles.sectionTitle}>Categories</Text>
        <Text style={styles.sectionDescription}>
          Choose what topics you want to learn about
        </Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Categories')}
        >
          <Text style={styles.actionButtonText}>Manage Categories</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>About Notifications</Text>
          <Text style={styles.infoText}>
            {Platform.OS === 'ios' 
              ? 'Notifications are scheduled throughout the day based on your interval setting. You\'ll receive up to 100 tidbits per day.'
              : 'Notifications are sent when you unlock your phone, up to 100 tidbits per day.'}
          </Text>
        </View>
      </View>

      {devModeEnabled && (
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
        
        {Platform.OS === 'ios' && devModeEnabled && (
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

      {devModeEnabled && (
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
        
        <Text style={styles.testButtonDescription}>
          Use these tools to test spaced repetition features. Check console logs for detailed info.
        </Text>
      </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutContent}>
          <Text style={styles.aboutText}>
            <Text style={styles.aboutLabel}>App Name:</Text> Tidbit
          </Text>
          <Text style={styles.aboutText}>
            <Text style={styles.aboutLabel}>Version:</Text> 1.0.0
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
              // Update this URL to your GitHub Pages URL once deployed
              // Example: https://yourusername.github.io/tidbit/privacy
              const privacyUrl = 'https://kushaldutta.github.io/tidbit/privacy'; // TODO: Update with your GitHub Pages URL
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
        
        <View style={[styles.settingRow, { marginTop: 16 }]}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>🔧 Developer Mode</Text>
            <Text style={styles.settingDescription}>
              {devModeEnabled ? 'Debug tools are visible' : 'Enable to show debug tools'}
            </Text>
          </View>
          <Switch
            value={devModeEnabled}
            onValueChange={handleDevModeToggle}
            trackColor={{ false: '#e5e7eb', true: '#6366f1' }}
            thumbColor="#ffffff"
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 32,
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  section: {
    backgroundColor: '#ffffff',
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
    color: '#1f2937',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6b7280',
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
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  intervalOptionSelected: {
    backgroundColor: '#ede9fe',
    borderColor: '#6366f1',
  },
  intervalOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  intervalOptionTextSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 20,
    color: '#6366f1',
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
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
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 50,
  },
  testButton: {
    backgroundColor: '#6366f1',
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
    color: '#6b7280',
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
    color: '#6b7280',
  },
  debugStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
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
    color: '#4b5563',
    marginBottom: 8,
  },
  aboutLabel: {
    fontWeight: '600',
    color: '#1f2937',
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
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  expandButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  expandButtonIcon: {
    fontSize: 12,
    color: '#6366f1',
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
    color: '#1f2937',
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
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 70,
    alignItems: 'center',
  },
  hourButtonSelected: {
    backgroundColor: '#ede9fe',
    borderColor: '#6366f1',
  },
  hourButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1f2937',
  },
  hourButtonTextSelected: {
    color: '#6366f1',
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
});

