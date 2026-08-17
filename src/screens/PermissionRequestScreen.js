import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { StorageService } from '../services/StorageService';
import { NotificationService } from '../services/NotificationService';
import { SyncService } from '../services/SyncService';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/Icon';
import { spacing, radius, type, elevation, iconSize } from '../theme/tokens';

export default function PermissionRequestScreen({ navigation, returningUser, onDismiss }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
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
            lightColor: theme.primary,
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
    if (returningUser) {
      try {
        await SyncService.syncProfilePreferences();
      } catch (e) {
        console.warn('[PermissionRequest] Cloud sync on finish failed:', e.message);
      }
      await StorageService.setItem('notification_prompt_dismissed_v1', 'true');
      onDismiss?.();
      return;
    }

    try {
      await SyncService.completeOnboarding();
    } catch (e) {
      console.warn('[PermissionRequest] Cloud sync on finish failed:', e.message);
      await StorageService.setOnboardingCompleted(true);
    }
  };

  /**
   * One heading and one line of body per state — the old version stacked a
   * screen title, a status title, and a description that all said the same thing.
   */
  const getPermissionMessage = () => {
    if (permissionStatus === 'granted') {
      return {
        icon: 'check',
        tone: theme.success,
        toneBg: theme.successBg,
        title: 'You\'re all set',
        description: 'Tidbits will arrive through the day. You can change how often, or pause them, anytime in Settings.',
        buttonText: 'Finish',
      };
    }
    if (permissionStatus === 'denied') {
      return {
        icon: 'notifications',
        tone: theme.textSecondary,
        toneBg: theme.surfaceAlt,
        title: 'No notifications for now',
        description: 'Everything else still works — you can study, play, and review whenever you open the app.',
        buttonText: 'Continue',
      };
    }
    return {
      icon: 'notifications',
      tone: theme.primary,
      toneBg: theme.primaryLight,
      title: returningUser ? 'Stay in the loop' : 'Learn between classes',
      description: 'We\'ll send a card from your decks a few times a day, so the material stays warm without you opening the app.',
      buttonText: 'Turn on notifications',
    };
  };

  const message = getPermissionMessage();
  const granted = permissionStatus === 'granted';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.iconWrap, { backgroundColor: message.toneBg }]}>
          <Icon name={message.icon} size={iconSize.xl} color={message.tone} />
        </View>

        <Text style={styles.title}>{message.title}</Text>
        <Text style={styles.description}>{message.description}</Text>

        {Platform.OS === 'ios' && permissionStatus === 'denied' && (
          <View style={styles.settingsBox}>
            <Text style={styles.settingsText}>
              To turn them on later: Settings → Tidbit → Notifications
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Exactly one primary button on screen at a time. When the ask is still
          pending, "Continue" is a quiet text link so it cannot compete with it. */}
      <View style={styles.footer}>
        {granted ? (
          <TouchableOpacity style={styles.primaryButton} onPress={handleFinish} activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>{message.buttonText}</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.primaryButton, isRequesting && styles.primaryButtonDisabled]}
              onPress={handleRequestPermissions}
              disabled={isRequesting}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>
                {isRequesting ? 'Requesting…' : message.buttonText}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleFinish} activeOpacity={0.7}>
              <Text style={styles.secondaryButtonText}>
                {returningUser ? 'Not now' : 'Skip for now'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.card,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xxxl,
    paddingTop: spacing.xxxl,
    alignItems: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    ...type.display,
    color: theme.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    ...type.body,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  settingsBox: {
    backgroundColor: theme.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.xxl,
  },
  settingsText: {
    ...type.caption,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.xxxl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.lg,
  },
  primaryButton: {
    backgroundColor: theme.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    ...elevation.raised,
    shadowColor: theme.primary,
    shadowOpacity: 0.3,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  secondaryButtonText: {
    ...type.bodyStrong,
    color: theme.textSecondary,
  },
});
