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
import { useTheme } from '../../context/ThemeContext';
import { spacing, radius, type } from '../../theme/tokens';

export default function LoginScreen({ route, navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [email, setEmail] = useState(route.params?.email || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  React.useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing info', 'Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await AuthService.signInWithEmail({ email, password });
      // App.js auth gate will handle navigation automatically.
    } catch (err) {
      if (err?.code === AuthService.EMAIL_NOT_CONFIRMED) {
        navigation.navigate('VerifyEmail', {
          email: err.email || email.trim().toLowerCase(),
        });
        return;
      }
      Alert.alert('Sign in failed', err.message || 'Try again.');
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

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert(
        'Enter your email',
        'Type your email above first, then tap "Forgot password" again.'
      );
      return;
    }
    try {
      await AuthService.sendPasswordReset(email);
      Alert.alert('Check your email', 'Password reset link sent.');
    } catch (err) {
      Alert.alert('Could not send reset', err.message || 'Try again.');
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
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Sign in to keep your decks, progress, and class groups in sync.
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
            placeholder="Password"
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            autoComplete="current-password"
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.disabled]}
            onPress={handleEmailLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign in</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleForgotPassword} disabled={loading}>
            <Text style={styles.linkMuted}>Forgot password?</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={
                AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
              }
              buttonStyle={
                AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={12}
              style={styles.appleButton}
              onPress={handleApple}
            />
          )}

          <TouchableOpacity
            onPress={() => navigation.navigate('SignUp')}
            disabled={loading}
            style={styles.footerRow}
          >
            <Text style={styles.footerMuted}>New to Tidbit? </Text>
            <Text style={styles.footerLink}>Create an account</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.card },
  scroll: {
    padding: spacing.xxl,
    paddingTop: 48,
    paddingBottom: 48,
  },
  title: {
    ...type.display,
    color: theme.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...type.callout,
    color: theme.textSecondary,
    marginBottom: spacing.xxxl,
  },
  input: {
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.text,
    marginBottom: spacing.md,
  },
  primaryButton: {
    backgroundColor: theme.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    backgroundColor: theme.card,
    borderWidth: 1.5,
    borderColor: theme.border,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  secondaryButtonText: { color: theme.text, fontSize: 16, fontWeight: '600' },
  appleButton: { height: 50, marginBottom: spacing.md },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.border },
  dividerText: {
    marginHorizontal: spacing.md,
    color: theme.textMuted,
    ...type.caption,
    fontWeight: '500',
  },
  linkMuted: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xxl,
  },
  footerMuted: { color: theme.textSecondary, fontSize: 15 },
  footerLink: { color: theme.primary, fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.6 },
});
