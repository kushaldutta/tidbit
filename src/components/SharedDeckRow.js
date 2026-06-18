import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
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
  onSave,
  voting,
  saving,
}) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const score = deck.score ?? 0;
  const upActive = deck.myVote === 1;
  const downActive = deck.myVote === -1;
  const busy = voting === deck.id;
  const savingBusy = saving === deck.id;

  const canReport = ReportService.canReportDeck(deck, myUserId);
  const canSave = onSave && deck.ownerId !== myUserId;
  const hasMenu = canReport || isModerator || canSave;

  const openMenu = () => {
    const options = [];
    const handlers = [];

    if (canSave) {
      options.push('Save to My Decks');
      handlers.push(() => onSave(deck));
    }
    if (canReport) {
      options.push('Report');
      handlers.push(() => onReport(deck));
    }
    if (isModerator) {
      options.push('Remove');
      handlers.push(() => onModRemove(deck));
    }
    options.push('Cancel');

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: isModerator ? options.indexOf('Remove') : undefined,
        },
        (index) => {
          if (index >= 0 && index < handlers.length) handlers[index]();
        }
      );
    } else {
      Alert.alert('Deck options', undefined, [
        ...handlers.map((fn, i) => ({
          text: options[i],
          onPress: fn,
          style: options[i] === 'Remove' ? 'destructive' : 'default',
        })),
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

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
      </View>

      <View style={styles.deckInfo}>
        <Text style={styles.deckTitle} numberOfLines={2}>
          {deck.title}
        </Text>
        <Text style={styles.deckMeta}>
          {deck.cardCount} cards · by {deck.ownerName}
        </Text>
      </View>

      <View style={styles.deckActions}>
        {deck.cardCount > 0 && (
          <TouchableOpacity
            style={styles.studyBtn}
            onPress={() => onStudy(deck)}
            activeOpacity={0.8}
          >
            <Text style={styles.studyBtnText}>Study</Text>
          </TouchableOpacity>
        )}
        {hasMenu && (
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={openMenu}
            disabled={savingBusy}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Text style={styles.menuBtnText}>⋯</Text>
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
  deckInfo: { flex: 1, marginRight: 8 },
  deckTitle: { fontSize: 15, fontWeight: '600', color: theme.text, lineHeight: 20 },
  deckMeta: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  deckActions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  studyBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  studyBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  menuBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.card || '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  menuBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.textSecondary,
    lineHeight: 20,
    marginTop: -2,
  },
});
