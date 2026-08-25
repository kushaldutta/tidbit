import React, { useState, useEffect, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { ProfileService } from '../services/ProfileService';
import { SCHOOLS } from '../config/schools';
import { useTheme } from '../context/ThemeContext';

const currentYear = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 8 }, (_, i) => String(currentYear + i));

export default function EditProfileScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [displayName, setDisplayName] = useState('');
  const [schoolId, setSchoolId] = useState(null);
  const [gradYear, setGradYear] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await ProfileService.getMyProfile();
      setDisplayName(profile?.display_name || '');
      setSchoolId(profile?.school_id || null);
      setGradYear(profile?.grad_year || null);
    } catch (err) {
      Alert.alert('Could not load profile', err.message || 'Try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSave = async () => {
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
      navigation.goBack();
    } catch (err) {
      Alert.alert('Could not save profile', err.message || 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={saving}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.subtitle}>
              This is how your name appears to classmates in groups and the feed.
            </Text>

            <Text style={styles.label}>Display name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Kushal D."
              placeholderTextColor={theme.textSecondary}
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
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.primaryLight,
    },
    backText: { fontSize: 16, fontWeight: '600', color: theme.primary },
    headerTitle: { fontSize: 17, fontWeight: '700', color: theme.text },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { padding: 24, paddingBottom: 48 },
    subtitle: {
      fontSize: 15,
      color: theme.textSecondary,
      marginBottom: 24,
      lineHeight: 22,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
      marginTop: 16,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.primaryLight,
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
      borderColor: theme.primaryLight,
      backgroundColor: theme.card,
    },
    optionChipActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    optionChipText: { fontSize: 14, fontWeight: '500', color: theme.text },
    optionChipTextActive: { color: theme.primary, fontWeight: '600' },
    yearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    yearChip: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: theme.primaryLight,
      backgroundColor: theme.card,
      minWidth: 70,
      alignItems: 'center',
    },
    yearChipActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    yearChipText: { fontSize: 14, fontWeight: '500', color: theme.text },
    yearChipTextActive: { color: theme.primary, fontWeight: '600' },
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
