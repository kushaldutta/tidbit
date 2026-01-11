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
} from 'react-native';
import { StorageService } from '../services/StorageService';
import { NotificationService } from '../services/NotificationService';
import { ContentService } from '../services/ContentService';

const INTERVAL_OPTIONS = [
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
];

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationInterval, setNotificationInterval] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const enabled = await StorageService.getNotificationsEnabled();
    const interval = await StorageService.getNotificationInterval();
    
    setNotificationsEnabled(enabled);
    setNotificationInterval(interval);
    setLoading(false);
  };

  const handleToggleNotifications = async (enabled) => {
    setNotificationsEnabled(enabled);
    await StorageService.setNotificationsEnabled(enabled);
    
    if (enabled && Platform.OS === 'ios') {
      // Reschedule notifications
      await NotificationService.scheduleRecurringNotifications(notificationInterval);
    } else {
      // Cancel all notifications
      await NotificationService.cancelAllNotifications();
    }
  };

  const handleIntervalChange = async (interval) => {
    setNotificationInterval(interval);
    await StorageService.setNotificationInterval(interval);
    
    if (notificationsEnabled && Platform.OS === 'ios') {
      // Reschedule notifications with new interval
      await NotificationService.scheduleRecurringNotifications(interval);
    }
  };

  const handleTestNotification = async () => {
    // Send an immediate test notification
    try {
      const tidbit = await ContentService.getRandomTidbit();
      if (tidbit) {
        await NotificationService.sendNotification(tidbit);
        Alert.alert('Success', 'Test notification sent! Check your notification center.');
      } else {
        Alert.alert('Error', 'Could not generate tidbit. Make sure you have categories selected.');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Could not send notification. Check if permissions are granted.');
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
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>About Notifications</Text>
          <Text style={styles.infoText}>
            {Platform.OS === 'ios' 
              ? 'Notifications are scheduled throughout the day based on your interval setting. You\'ll receive up to 20 tidbits per day.'
              : 'Notifications are sent when you unlock your phone, up to 20 tidbits per day.'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.testButton}
          onPress={handleTestNotification}
        >
          <Text style={styles.testButtonText}>Send Test Notification</Text>
        </TouchableOpacity>
        <Text style={styles.testButtonDescription}>
          Send an immediate notification to test if notifications are working in Expo Go
        </Text>
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
  },
});

