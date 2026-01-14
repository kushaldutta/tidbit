import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { StorageService } from '../services/StorageService';
import { NotificationService } from '../services/NotificationService';

export default function PermissionRequestScreen({ navigation }) {
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const checkPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status);
    return status;
  };

  React.useEffect(() => {
    checkPermissions();
  }, []);

  const handleRequestPermissions = async () => {
    setIsRequesting(true);
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionStatus(status);
      
      if (status === 'granted') {
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
        
        // Enable notifications in settings
        await StorageService.setNotificationsEnabled(true);
        
        // Push notifications are handled by server - token registration will happen automatically
      } else if (status === 'denied') {
        Alert.alert(
          'Permission Denied',
          'You can enable notifications later in your device settings. You can still use the app to view tidbits manually.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'Could not request notification permissions.');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleFinish = async () => {
    // Mark onboarding as complete
    await StorageService.setOnboardingCompleted(true);
    
    // App.js will detect the change via the interval check and switch to main app
    // No need to navigate - the conditional rendering in App.js will handle it
  };

  const getPermissionMessage = () => {
    if (permissionStatus === 'granted') {
      return {
        title: '✅ Notifications Enabled',
        description: 'You\'ll receive tidbits throughout the day based on your preferences.',
        buttonText: 'Finish',
      };
    } else if (permissionStatus === 'denied') {
      return {
        title: 'Notifications Disabled',
        description: 'You can enable notifications later in your device settings. The app will still work for manual learning.',
        buttonText: 'Continue Anyway',
      };
    } else {
      return {
        title: 'Enable Notifications',
        description: 'Allow notifications so we can send you tidbits throughout the day. You can change this anytime in settings.',
        buttonText: 'Enable Notifications',
      };
    }
  };

  const message = getPermissionMessage();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Almost there!</Text>
          <Text style={styles.subtitle}>
            {message.title}
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            {message.description}
          </Text>
        </View>

        {permissionStatus !== 'granted' && (
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={handleRequestPermissions}
            disabled={isRequesting}
            activeOpacity={0.8}
          >
            <Text style={styles.permissionButtonText}>
              {isRequesting ? 'Requesting...' : message.buttonText}
            </Text>
          </TouchableOpacity>
        )}

        {Platform.OS === 'ios' && permissionStatus === 'denied' && (
          <View style={styles.settingsBox}>
            <Text style={styles.settingsText}>
              To enable notifications later, go to: Settings → Tidbit → Notifications
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.finishButton}
          onPress={handleFinish}
          activeOpacity={0.8}
        >
          <Text style={styles.finishButtonText}>
            {permissionStatus === 'granted' ? 'Finish' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 32,
    paddingTop: 20,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 20,
    color: '#6366f1',
    fontWeight: '600',
    lineHeight: 28,
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  infoText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1e40af',
  },
  permissionButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#6366f1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  settingsBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  settingsText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6b7280',
    textAlign: 'center',
  },
  finishButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  finishButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});

