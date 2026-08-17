import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';
import { spacing, radius, type, elevation, iconSize } from '../theme/tokens';

/** Text and fills that sit ON the coloured card, so they work over any theme. */
const ON_CARD = '#ffffff';
const ON_CARD_MUTED = 'rgba(255, 255, 255, 0.85)';
const ON_CARD_TRACK = 'rgba(255, 255, 255, 0.3)';

function CardHeader({ styles, trailing }) {
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Icon name="studyPlan" size={iconSize.md} color={ON_CARD} />
        <Text style={styles.title}>Today's Study Plan</Text>
      </View>
      {trailing}
    </View>
  );
}

export default function StudyPlanCard({ plan, onPress, isLoading }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  if (isLoading) {
    return (
      <View style={styles.card}>
        <CardHeader styles={styles} />
        <Text style={styles.mutedText}>Generating your plan…</Text>
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={styles.card}>
        <CardHeader styles={styles} />
        <Text style={styles.mutedText}>
          No plan yet — enroll in a class on the Categories tab to get started.
        </Text>
      </View>
    );
  }

  const isCompleted = plan.completed;
  const total = plan.totalCount || 0;
  const done = plan.completedCount || 0;
  // Guard the divide: an empty plan has totalCount 0, which produced "NaN%"
  // and a progress bar that failed to lay out.
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

  return (
    <TouchableOpacity
      style={[styles.card, isCompleted && styles.cardCompleted]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={isCompleted}
    >
      <CardHeader
        styles={styles}
        trailing={
          isCompleted ? (
            <View style={styles.completedBadge}>
              <Icon name="check" size={iconSize.sm} color={ON_CARD} filled />
            </View>
          ) : null
        }
      />

      <Text style={styles.planText}>
        Do {plan.dueCount} due + {plan.newCount} new ({plan.estimatedMinutes} min)
      </Text>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {isCompleted ? `Completed (${done}/${total})` : `${done}/${total} done`}
        </Text>
      </View>

      {!isCompleted && (
        <TouchableOpacity style={styles.startButton} onPress={onPress}>
          <Text style={styles.startButtonText}>Start Session</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  card: {
    backgroundColor: theme.primary,
    borderRadius: radius.card,
    padding: spacing.xl,
    marginBottom: spacing.xxl,
    ...elevation.raised,
    shadowColor: theme.primary,
    shadowOpacity: 0.3,
  },
  // Completion reads as success, not as a second brand colour.
  cardCompleted: {
    backgroundColor: theme.success,
    shadowColor: theme.success,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  title: {
    ...type.heading,
    fontSize: 20,
    color: ON_CARD,
  },
  completedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ON_CARD_TRACK,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planText: {
    fontSize: 18,
    color: ON_CARD,
    marginBottom: spacing.lg,
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: ON_CARD_TRACK,
    borderRadius: 4, // half the 8pt track height — a true pill
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: ON_CARD,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: ON_CARD,
    fontWeight: '500',
  },
  startButton: {
    marginTop: spacing.lg,
    backgroundColor: ON_CARD,
    borderRadius: radius.md,
    padding: 14,
    alignItems: 'center',
  },
  startButtonText: {
    color: theme.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  mutedText: {
    ...type.callout,
    color: ON_CARD_MUTED,
  },
});
