import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ReportService } from '../services/ReportService';

export default function SharedDeckRow({
  deck,
  myUserId,
  isModerator,
  onVote,
  onStudy,
  onReport,
  onModRemove,
  voting,
}) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const score = deck.score ?? 0;
  const upActive = deck.myVote === 1;
  const downActive = deck.myVote === -1;
  const busy = voting === deck.id;

  return (
    <View style={styles.deckCard}>
      <View style={styles.voteColumn}>
        <TouchableOpacity
          style={[styles.voteBtn, upActive && styles.voteBtnUpActive]}
          onPress={() => onVote(deck, 1)}
          disabled={busy}
          hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Text style={[styles.voteArrow, upActive && styles.voteArrowUpActive]}>▲</Text>
        </TouchableOpacity>
        <Text
          style={[
            styles.voteScore,
            score > 0 && styles.voteScorePositive,
            score < 0 && styles.voteScoreNegative,
          ]}
        >
          {score}
        </Text>
        <TouchableOpacity
          style={[styles.voteBtn, downActive && styles.voteBtnDownActive]}
          onPress={() => onVote(deck, -1)}
          disabled={busy}
          hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Text style={[styles.voteArrow, downActive && styles.voteArrowDownActive]}>▼</Text>
        </TouchableOpacity>
        <Text style={styles.voteMeta}>{deck.upvotes}↑</Text>
      </View>

      <View style={styles.deckInfo}>
        <Text style={styles.deckTitle}>{deck.title}</Text>
        <Text style={styles.deckMeta}>
          {deck.cardCount} cards · by {deck.ownerName}
        </Text>
      </View>

      <View style={styles.deckActions}>
        {ReportService.canReportDeck(deck, myUserId) && (
          <TouchableOpacity
            style={styles.reportDeckBtn}
            onPress={() => onReport(deck)}
            activeOpacity={0.7}
          >
            <Text style={styles.reportBtnText}>Report</Text>
          </TouchableOpacity>
        )}
        {isModerator && (
          <TouchableOpacity
            style={styles.modRemoveDeckBtn}
            onPress={() => onModRemove(deck)}
            activeOpacity={0.7}
          >
            <Text style={styles.modRemoveBtnText}>Remove</Text>
          </TouchableOpacity>
        )}
        {deck.cardCount > 0 && (
          <TouchableOpacity
            style={styles.studyBtn}
            onPress={() => onStudy(deck)}
            activeOpacity={0.8}
          >
            <Text style={styles.studyBtnText}>Study</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  deckCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.background,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  voteColumn: {
    alignItems: 'center',
    marginRight: 12,
    minWidth: 36,
  },
  voteBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  voteBtnUpActive: { backgroundColor: '#dcfce7' },
  voteBtnDownActive: { backgroundColor: '#fee2e2' },
  voteArrow: { fontSize: 14, color: theme.textSecondary, lineHeight: 16 },
  voteArrowUpActive: { color: '#16a34a' },
  voteArrowDownActive: { color: '#dc2626' },
  voteScore: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textSecondary,
    marginVertical: 2,
  },
  voteScorePositive: { color: '#16a34a' },
  voteScoreNegative: { color: '#dc2626' },
  voteMeta: { fontSize: 10, color: theme.textSecondary, marginTop: 2 },
  deckInfo: { flex: 1 },
  deckTitle: { fontSize: 15, fontWeight: '600', color: theme.text },
  deckMeta: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  deckActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  reportDeckBtn: { paddingVertical: 6, paddingHorizontal: 8 },
  reportBtnText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  modRemoveDeckBtn: { paddingVertical: 6, paddingHorizontal: 8 },
  modRemoveBtnText: { fontSize: 12, fontWeight: '600', color: '#dc2626' },
  studyBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  studyBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
