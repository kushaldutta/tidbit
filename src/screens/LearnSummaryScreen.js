import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/Icon';
import { spacing, radius, iconSize } from '../theme/tokens';

/**
 * Learn modes share the theme's primary colour rather than each carrying its own
 * hue — a violet Recall pill on the Forest theme was the old giveaway.
 */
const MODE_CONFIG = {
  quiz: { icon: 'quiz', label: 'Quiz' },
  recall: { icon: 'recall', label: 'Recall' },
  review: { icon: 'reviewQueue', label: 'Review' },
  match: { icon: 'match', label: 'Match' },
  flashcard: { icon: 'deck', label: 'Flashcards' },
};

function ScoreMeter({ correct, total, styles, theme }) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  let icon, msg, color;
  if (pct === 100) { icon = 'trophy'; msg = 'Perfect score'; color = theme.success; }
  else if (pct >= 75) { icon = 'check'; msg = 'Great job'; color = theme.success; }
  else if (pct >= 50) { icon = 'accuracy'; msg = 'Solid effort'; color = theme.warning; }
  // A low score is a prompt to keep going, not an error — so it stays neutral.
  else { icon = 'study'; msg = 'Keep practicing'; color = theme.textSecondary; }

  return (
    <View style={styles.meterWrap}>
      <Icon name={icon} size={iconSize.hero} color={color} filled style={styles.meterIcon} />
      <Text style={[styles.meterPct, { color }]}>{pct}%</Text>
      <Text style={styles.meterMsg}>{msg}</Text>
      <Text style={styles.meterSub}>{correct} / {total} correct</Text>
    </View>
  );
}

export default function LearnSummaryScreen({ route, navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { deckTitle, correct, total, mode, deckId, studyScope } = route.params;
  const cfg = MODE_CONFIG[mode] || MODE_CONFIG.quiz;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.modePill}>
            <Icon name={cfg.icon} size={iconSize.sm} color={theme.primary} filled />
            <Text style={styles.modeLabel}>{cfg.label} complete</Text>
          </View>
          <Text style={styles.deckTitle} numberOfLines={2}>{deckTitle}</Text>
        </View>

        <ScoreMeter correct={correct} total={total} styles={styles} theme={theme} />

        <View style={styles.sameBoatNote}>
          <Icon name="insights" size={iconSize.md} color={theme.info} style={styles.sameBoatIcon} />
          <Text style={styles.sameBoatNoteText}>
            Your results feed the class Same-Boat stats your classmates see.
          </Text>
        </View>

        <View style={styles.actions}>
          {deckId && mode !== 'review' && (
            <>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation.replace(
                  mode === 'quiz' ? 'Quiz' : mode === 'recall' ? 'Recall' : 'Match',
                  { deckId, deckTitle, studyScope }
                )}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnText}>Play again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => navigation.replace('LearnModePicker', { deckId, deckTitle })}
                activeOpacity={0.8}
              >
                <Text style={styles.pickerBtnText}>Try another mode</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.homeBtn}
            // Home is a tab inside the "Main" navigator, so it needs the nested
            // form — a bare navigate('Home') resolves against this stack and fails.
            onPress={() => navigation.navigate('Main', { screen: 'Home' })}
            activeOpacity={0.8}
          >
            <Text style={styles.homeBtnText}>← Back to home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scroll: { padding: spacing.xxl, paddingBottom: spacing.xxxl },

  header: { alignItems: 'center', marginBottom: spacing.xxl },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: theme.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  modeLabel: { fontSize: 14, fontWeight: '600', color: theme.primary },
  deckTitle: { fontSize: 22, fontWeight: '700', color: theme.text, textAlign: 'center' },

  meterWrap: {
    backgroundColor: theme.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    padding: spacing.xxl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  meterIcon: { marginBottom: spacing.md },
  meterPct: { fontSize: 48, fontWeight: '700', marginBottom: spacing.xs },
  meterMsg: { fontSize: 18, fontWeight: '600', color: theme.text, marginBottom: spacing.xs },
  meterSub: { fontSize: 15, color: theme.textSecondary },

  sameBoatNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.infoBg,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.info,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  sameBoatIcon: { marginRight: spacing.md },
  sameBoatNoteText: { flex: 1, fontSize: 13, color: theme.infoText, lineHeight: 19 },

  actions: { gap: spacing.md },
  actionBtn: {
    backgroundColor: theme.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  actionBtnText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  pickerBtn: {
    backgroundColor: theme.primaryLight,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.accent,
  },
  pickerBtnText: { color: theme.primary, fontWeight: '600', fontSize: 16 },
  homeBtn: { paddingVertical: spacing.md, alignItems: 'center' },
  homeBtnText: { color: theme.textSecondary, fontWeight: '600', fontSize: 15 },
});
