import React, { useState, useEffect } from 'react';
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
import { AuthService } from '../../services/AuthService';
import { ProfileService } from '../../services/ProfileService';
import { SCHOOLS } from '../../config/schools';
import { useTheme } from '../../context/ThemeContext';

const currentYear = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 8 }, (_, i) => String(currentYear + i));

export default function OnboardingProfileScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [displayName, setDisplayName] = useState('');
  const [schoolId, setSchoolId] = useState(null);
  const [gradYear, setGradYear] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const user = AuthService.getUser();
    const seed =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split('@')[0] ||
      '';
    setDisplayName(seed);
  }, []);

  const handleContinue = async () => {
    if (!displayName.trim()) {
      Alert.alert('Add your name', 'How should classmates see you?');
      return;
    }
    if (!schoolId) {
      Alert.alert('Pick your school', 'We use this to suggest your classes.');
      return;
    }
    if (!gradYear) {
      Alert.alert('Pick your grad year', 'Helps us match you to classmates.');
      return;
    }
    setSaving(true);
    try {
      await ProfileService.upsertProfile({
        display_name: displayName.trim(),
        school_id: schoolId,
        grad_year: gradYear,
      });
      // App.js will re-check profile completion and route to class selection.
      navigation.replace('ClassSelection', { schoolId });
    } catch (err) {
      const expired =
        err.message?.includes('session expired') ||
        AuthService.isStaleSessionError(err) ||
        AuthService.isAuthMismatchError(err);
      if (expired) {
        Alert.alert(
          'Session expired',
          'Please sign in again to continue.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Could not save profile', err.message || 'Try again.');
      }
    } finally {
      setSaving(false);
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
          <Text style={styles.title}>Tell us about you</Text>
          <Text style={styles.subtitle}>
            Quick profile so we can connect you with classmates and curate your
            decks.
          </Text>

          <Text style={styles.label}>Display name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Kushal D."
            placeholderTextColor={theme.textMuted}
            value={displayName}
            onChangeText={setDisplayName}
            editable={!saving}
            autoCapitalize="words"
            maxLength={40}
          />

          <Text style={styles.label}>School</Text>
          <View style={styles.optionsRow}>
            {SCHOOLS.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.optionChip,
                  schoolId === s.id && styles.optionChipActive,
                ]}
                onPress={() => setSchoolId(s.id)}
                disabled={saving}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    schoolId === s.id && styles.optionChipTextActive,
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Graduation year</Text>
          <View style={styles.yearGrid}>
            {GRAD_YEARS.map((y) => (
              <TouchableOpacity
                key={y}
                style={[
                  styles.yearChip,
                  gradYear === y && styles.yearChipActive,
                ]}
                onPress={() => setGradYear(y)}
                disabled={saving}
              >
                <Text
                  style={[
                    styles.yearChipText,
                    gradYear === y && styles.yearChipTextActive,
                  ]}
                >
                  {y}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, saving && styles.disabled]}
            onPress={handleContinue}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.card },
  scroll: { padding: 24, paddingTop: 48, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: '700', color: theme.text, marginBottom: 8 },
  subtitle: {
    fontSize: 15,
    color: theme.textSecondary,
    marginBottom: 32,
    lineHeight: 22,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.card,
  },
  optionChipActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primaryLight,
  },
  optionChipText: { fontSize: 14, fontWeight: '500', color: theme.textSecondary },
  optionChipTextActive: { color: theme.primaryDark, fontWeight: '600' },
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  yearChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.card,
    minWidth: 70,
    alignItems: 'center',
  },
  yearChipActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primaryLight,
  },
  yearChipText: { fontSize: 14, fontWeight: '500', color: theme.textSecondary },
  yearChipTextActive: { color: theme.primaryDark, fontWeight: '600' },
  primaryButton: {
    backgroundColor: theme.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.6 },
});
