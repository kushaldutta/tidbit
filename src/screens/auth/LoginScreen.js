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

export default function LoginScreen({ route, navigation }) {
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
            placeholderTextColor="#9ca3af"
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
            placeholderTextColor="#9ca3af"
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: {
    padding: 24,
    paddingTop: 48,
    paddingBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 32,
    lineHeight: 22,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
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
  secondaryButtonText: { color: '#111827', fontSize: 16, fontWeight: '600' },
  appleButton: { height: 50, marginBottom: 12 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: {
    marginHorizontal: 12,
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '500',
  },
  linkMuted: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerMuted: { color: '#6b7280', fontSize: 15 },
  footerLink: { color: '#6366f1', fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.6 },
});
