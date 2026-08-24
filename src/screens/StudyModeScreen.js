import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { StudyPlanService } from '../services/StudyPlanService';
import { CardLearningService } from '../services/CardLearningService';
import { BuddyService } from '../services/BuddyService';
import { useTheme } from '../context/ThemeContext';
import CoinBalanceChip from '../components/CoinBalanceChip';
import NavRow from '../components/NavRow';
import { spacing, radius, type, elevation } from '../theme/tokens';

const SESSIONS = [
  { label: 'Quick', count: 5 },
  { label: 'Standard', count: 10 },
  { label: 'Focused', count: 15 },
  { label: 'Deep', count: 30 },
];

export default function StudyModeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [dueCount, setDueCount] = useState(0);
  const [buddyRequestCount, setBuddyRequestCount] = useState(0);

  useFocusEffect(useCallback(() => {
    CardLearningService.getTotalDueCount().then(setDueCount);
    BuddyService.getPendingRequests()
      .then((reqs) => setBuddyRequestCount(reqs.length))
      .catch(() => {});
  }, []));

  const startSession = async (durationMinutes) => {
    try {
      setIsGenerating(true);
      setError(null);

      const totalTidbits = Math.max(3, durationMinutes);
      const tidbits = await StudyPlanService.generateSessionTidbits(totalTidbits);

      if (!tidbits || tidbits.length === 0) {
        setError(
          'Not enough tidbits available. Try selecting more categories or seeing more tidbits first.'
        );
        setIsGenerating(false);
        return;
      }

      navigation.navigate('StudySession', { tidbits });
    } catch (e) {
      console.error('[STUDY_MODE] Error starting session:', e);
      setError('Something went wrong starting your session. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Study</Text>
          <Text style={styles.subtitle}>Practice, review, and play</Text>
        </View>
        <CoinBalanceChip navigation={navigation} />
      </View>

      <NavRow
        icon="startLearning"
        title="Start Learning"
        sub="Quiz · Recall · Match · Speed Run"
        onPress={() => navigation.navigate('LearnModePicker')}
        tone="accent"
      />

      <NavRow
        icon={dueCount > 0 ? 'reviewQueue' : 'check'}
        title="Review Queue"
        sub={dueCount > 0 ? `${dueCount} due now` : 'Nothing due — nice work'}
        onPress={() => navigation.navigate('ReviewQueue')}
      />

      <NavRow
        icon="games"
        title="Games"
        sub="Daily Challenge · Speed Duel · Runner"
        onPress={() => navigation.navigate('Games')}
      />

      <NavRow
        icon="buddy"
        title="Buddy requests"
        sub={
          buddyRequestCount > 0
            ? `${buddyRequestCount} waiting — accept or decline`
            : 'Incoming study-buddy invites'
        }
        onPress={() => navigation.navigate('BuddyRequests')}
        badge={buddyRequestCount}
      />

      <View style={styles.sessionSection}>
        <Text style={styles.sectionTitle}>Focused Sessions</Text>
        <Text style={styles.sectionSub}>Mixes reviews you owe with new material.</Text>
        <View style={styles.sessionGrid}>
          {SESSIONS.map(({ label, count }) => (
            <TouchableOpacity
              key={label}
              style={[styles.sessionTile, isGenerating && styles.sessionTileDisabled]}
              onPress={() => startSession(count)}
              disabled={isGenerating}
              activeOpacity={0.7}
            >
              <Text style={styles.sessionLabel}>{label}</Text>
              <Text style={styles.sessionCount}>{count} cards</Text>
            </TouchableOpacity>
          ))}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {isGenerating && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={styles.loadingText}>Building your session</Text>
          </View>
        )}
      </View>

      <NavRow
        icon="decks"
        title="My Decks"
        sub="Create, edit, and manage your flashcard decks"
        onPress={() => navigation.navigate('MyDecks')}
      />
    </ScrollView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl + spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: theme.textSecondary,
  },

  sessionSection: { marginTop: spacing.xs, marginBottom: spacing.xl },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: spacing.xs,
  },
  sectionSub: {
    fontSize: 13,
    color: theme.textSecondary,
    marginBottom: spacing.md,
  },
  sessionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  sessionTile: {
    flexGrow: 1,
    flexBasis: '44%',
    backgroundColor: theme.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    ...elevation.card,
  },
  sessionTileDisabled: { opacity: 0.5 },
  sessionLabel: { fontSize: 16, fontWeight: '600', color: theme.text },
  sessionCount: {
    ...type.overline,
    color: theme.textSecondary,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  errorText: {
    marginTop: spacing.md,
    color: theme.danger,
    fontSize: 14,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  loadingText: {
    color: theme.textSecondary,
    fontSize: 14,
  },
});
