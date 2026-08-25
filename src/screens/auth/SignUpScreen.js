import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { AuthService } from '../../services/AuthService';
import { AnalyticsService } from '../../services/AnalyticsService';
import { openLegalUrl, PRIVACY_URL, TERMS_URL } from '../../constants/legalUrls';
import { useTheme } from '../../context/ThemeContext';

const MIN_PASSWORD = 8;

export default function SignUpScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  React.useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Missing info', 'Enter an email and password.');
      return;
    }
    if (password.length < MIN_PASSWORD) {
      Alert.alert(
        'Password too short',
        `Use at least ${MIN_PASSWORD} characters.`
      );
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Re-enter the same password.');
      return;
    }
    setLoading(true);
    try {
      const result = await AuthService.signUpWithEmail({ email, password });
      AnalyticsService.track('signup_completed', {
        method: 'email',
        needs_verification: Boolean(result?.needsEmailVerification),
      });
      if (result?.needsEmailVerification) {
        navigation.navigate('VerifyEmail', {
          email: email.trim().toLowerCase(),
        });
        return;
      }
      // Verified immediately (e.g. confirm email disabled in Supabase) — App.js routes on.
    } catch (err) {
      Alert.alert('Sign up failed', err.message || 'Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApple = async () => {
    setLoading(true);
    try {
      await AuthService.signInWithApple();
    } catch (err) {
      if (err?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple sign-in failed', err.message || 'Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            Build custom decks, join your class group, and pick up where you
            left off on any device.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Password (8+ characters)"
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            autoComplete="new-password"
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm password"
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            autoComplete="new-password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.disabled]}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Create account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or sign up with</Text>
            <View style={styles.dividerLine} />
          </View>

          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={
                AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
              }
              buttonStyle={
                AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={12}
              style={styles.appleButton}
              onPress={handleApple}
            />
          )}

          <Text style={styles.legal}>
            By continuing you agree to our{' '}
            <Text
              style={styles.legalLink}
              onPress={() => openLegalUrl(TERMS_URL, 'Terms of Service')}
            >
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text
              style={styles.legalLink}
              onPress={() => openLegalUrl(PRIVACY_URL, 'Privacy Policy')}
            >
              Privacy Policy
            </Text>
            .
          </Text>

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            disabled={loading}
            style={styles.footerRow}
          >
            <Text style={styles.footerMuted}>Already have an account? </Text>
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.card },
  scroll: { padding: 24, paddingTop: 48, paddingBottom: 48 },
  title: { fontSize: 32, fontWeight: '700', color: theme.text, marginBottom: 8 },
  subtitle: {
    fontSize: 15,
    color: theme.textSecondary,
    marginBottom: 32,
    lineHeight: 22,
  },
  input: {
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.text,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: theme.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    backgroundColor: theme.card,
    borderWidth: 1.5,
    borderColor: theme.border,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: { color: theme.text, fontSize: 16, fontWeight: '600' },
  appleButton: { height: 50, marginBottom: 12 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.border },
  dividerText: {
    marginHorizontal: 12,
    color: theme.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  legal: {
    fontSize: 12,
    color: theme.textMuted,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  legalLink: {
    color: theme.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerMuted: { color: theme.textSecondary, fontSize: 15 },
  footerLink: { color: theme.primary, fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.6 },
});
