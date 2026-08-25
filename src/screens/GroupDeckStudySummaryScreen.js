import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/Icon';
import { spacing, radius, iconSize } from '../theme/tokens';

export default function GroupDeckStudySummaryScreen({ route, navigation }) {
  const {
    deckId,
    deckTitle,
    classId,
    groupId,
    code,
    title,
    results = [],
  } = route.params;
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const studyParams = { deckId, deckTitle, classId, groupId, code, title };

  const handleBackToGroup = () => {
    if (groupId && classId) {
      navigation.navigate('Group', { groupId, classId, code, title });
      return;
    }
    navigation.goBack();
  };

  const handleStudyAgain = () => {
    navigation.replace('GroupDeckStudy', {
      ...studyParams,
      restartKey: Date.now(),
    });
  };

  const knew = results.filter((r) => r.knew).length;
  const didntKnow = results.length - knew;
  const pct = results.length > 0 ? Math.round((knew / results.length) * 100) : 0;

  let gradeIcon, gradeColor, gradeMsg;
  if (pct >= 80) { gradeIcon = 'trophy'; gradeColor = theme.successText; gradeMsg = 'Excellent!'; }
  else if (pct >= 60) { gradeIcon = 'check'; gradeColor = theme.warningText; gradeMsg = 'Good job!'; }
  else { gradeIcon = 'startLearning'; gradeColor = theme.dangerText; gradeMsg = 'Keep practicing!'; }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <Icon name={gradeIcon} size={iconSize.hero} color={gradeColor} style={styles.gradeIcon} />
        <Text style={[styles.gradeMsg, { color: gradeColor }]}>{gradeMsg}</Text>
        <Text style={styles.deckTitle}>{deckTitle}</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: theme.successBg }]}>
            <Text style={styles.statNum}>{knew}</Text>
            <Text style={styles.statLabel}>Knew it</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.warningBg }]}>
            <Text style={styles.statNum}>{pct}%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.dangerBg }]}>
            <Text style={styles.statNum}>{didntKnow}</Text>
            <Text style={styles.statLabel}>Didn't know</Text>
          </View>
        </View>

        <Text style={styles.sameBoatNote}>
          Your attempts were recorded — classmates studying this deck will now see
          class-level accuracy on each card.
        </Text>

        {/* Actions */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleBackToGroup}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Back to group</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={handleStudyAgain}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryBtnText}>Study again</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: { alignItems: 'center', padding: spacing.xxl, paddingTop: 48 },

  gradeIcon: { marginBottom: spacing.sm },
  gradeMsg: { fontSize: 28, fontWeight: '700', marginBottom: spacing.xs },
  deckTitle: {
    fontSize: 14,
    color: theme.textMuted,
    marginBottom: spacing.xxxl,
    textAlign: 'center',
  },

  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xxl,
    width: '100%',
  },
  statBox: {
    flex: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 11,
    color: theme.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },

  sameBoatNote: {
    fontSize: 13,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xxxl,
    backgroundColor: theme.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
  },

  primaryBtn: {
    backgroundColor: theme.primary,
    borderRadius: radius.card,
    paddingVertical: spacing.lg,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  secondaryBtn: {
    borderRadius: radius.card,
    paddingVertical: spacing.md,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.border,
  },
  secondaryBtnText: { color: theme.primary, fontWeight: '600', fontSize: 15 },
});
