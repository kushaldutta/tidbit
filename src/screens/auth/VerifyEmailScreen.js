import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthService } from '../../services/AuthService';

export default function VerifyEmailScreen({ route, navigation }) {
  const email = route.params?.email || '';
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    if (!email) {
      Alert.alert('Missing email', 'Go back and sign up again with your email address.');
      return;
    }
    setResending(true);
    try {
      await AuthService.resendSignupConfirmation(email);
      Alert.alert(
        'Email sent',
        `We sent another confirmation link to ${email}.`
      );
    } catch (err) {
      Alert.alert('Could not resend', err.message || 'Try again in a minute.');
    } finally {
      setResending(false);
    }
  };

  const handleContinueToSignIn = () => {
    navigation.navigate('Login', { email });
  };

  const handleUseDifferentEmail = () => {
    navigation.navigate('SignUp');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.emoji}>✉️</Text>
        <Text style={styles.title}>Confirm your email</Text>
        <Text style={styles.subtitle}>
          We sent a confirmation link to{' '}
          <Text style={styles.email}>{email || 'your email'}</Text>. Open it to
          verify your account, then sign in.
        </Text>

        <View style={styles.steps}>
          <Text style={styles.step}>1. Check your inbox (and spam folder)</Text>
          <Text style={styles.step}>2. Tap the confirmation link</Text>
          <Text style={styles.step}>3. Return here and sign in</Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleContinueToSignIn}
          disabled={resending}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Continue to sign in</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, resending && styles.disabled]}
          onPress={handleResend}
          disabled={resending}
          activeOpacity={0.85}
        >
          {resending ? (
            <ActivityIndicator color="#6366f1" />
          ) : (
            <Text style={styles.secondaryButtonText}>Resend confirmation email</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleUseDifferentEmail}
          disabled={resending}
          style={styles.footerRow}
        >
          <Text style={styles.footerMuted}>Wrong email? </Text>
          <Text style={styles.footerLink}>Use a different one</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: {
    padding: 24,
    paddingTop: 48,
    paddingBottom: 48,
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 24,
    lineHeight: 22,
  },
  email: { color: '#111827', fontWeight: '600' },
  steps: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 28,
    gap: 8,
  },
  step: { fontSize: 14, color: '#374151', lineHeight: 20 },
  primaryButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: { color: '#6366f1', fontSize: 16, fontWeight: '600' },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  footerMuted: { color: '#6b7280', fontSize: 15 },
  footerLink: { color: '#6366f1', fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.6 },
});
