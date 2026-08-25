import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeckService } from '../services/DeckService';
import { SameBoatService } from '../services/SameBoatService';
import { CardLearningService } from '../services/CardLearningService';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/Icon';
import { spacing, radius, elevation, iconSize } from '../theme/tokens';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Same-Boat banner ────────────────────────────────────────────────────────

function SameBoatBanner({ stat, styles, theme }) {
  if (!stat || stat.attempts < 2) return null;

  const pct = stat.pctCorrect ?? 0;
  const wrongPct = Math.round(100 - pct);
  let message, icon, bg, textColor;

  if (wrongPct >= 60) {
    message = `${wrongPct}% of your classmates got this wrong too`;
    icon = 'buddy';
    bg = theme.dangerBg;
    textColor = theme.dangerText;
  } else if (wrongPct >= 30) {
    message = `${Math.round(pct)}% of your classmates got this right`;
    icon = 'accuracy';
    bg = theme.warningBg;
    textColor = theme.warningText;
  } else {
    message = `${Math.round(pct)}% of your classmates got this right — tricky one?`;
    icon = 'trophy';
    bg = theme.successBg;
    textColor = theme.successText;
  }

  return (
    <View style={[styles.sameBoatBanner, { backgroundColor: bg }]}>
      <Icon name={icon} size={iconSize.lg} color={textColor} />
      <View style={styles.sameBoatTextWrap}>
        <Text style={[styles.sameBoatMessage, { color: textColor }]}>{message}</Text>
        <Text style={styles.sameBoatAttempts}>{stat.attempts} classmate attempt{stat.attempts !== 1 ? 's' : ''}</Text>
      </View>
    </View>
  );
}

// ─── main screen ─────────────────────────────────────────────────────────────

export default function GroupDeckStudyScreen({ route, navigation }) {
  const { deckId, deckTitle, classId, groupId, code, title, restartKey } = route.params;
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [sameBoatStat, setSameBoatStat] = useState(null);
  const [results, setResults] = useState([]); // { cardId, knew }

  // Flip animation
  const flipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setIndex(0);
    setFlipped(false);
    setSameBoatStat(null);
    setResults([]);
    flipAnim.setValue(0);
    setLoading(true);

    DeckService.listCards(deckId)
      .then((c) => setCards(c || []))
      .catch(() => setCards([]))
      .finally(() => setLoading(false));
  }, [deckId, restartKey]);

  const currentCard = cards[index];

  const handleFlip = async () => {
    if (flipped) return;

    // Animate card flip
    Animated.spring(flipAnim, {
      toValue: 1,
      friction: 8,
      useNativeDriver: true,
    }).start();

    setFlipped(true);

    // Fetch Same-Boat stat for this card
    if (currentCard?.id) {
      const stat = await SameBoatService.getCardStat(currentCard.id);
      setSameBoatStat(stat);
    }
  };

  const handleAnswer = async (knew) => {
    if (!currentCard) return;

    // Record the attempt
    await SameBoatService.recordAttempt(currentCard.id, knew, 'group_study');
    await CardLearningService.recordReview(currentCard.id, {
      wasCorrect: knew,
      mode: 'group_study',
      action: knew ? 'knew' : 'didnt_know',
    });
    setResults((prev) => [...prev, { cardId: currentCard.id, knew }]);

    const next = index + 1;
    if (next >= cards.length) {
      // Done — show summary
      navigation.replace('GroupDeckStudySummary', {
        deckId,
        deckTitle,
        classId,
        groupId,
        code,
        title,
        results: [...results, { cardId: currentCard.id, knew }],
        totalCards: cards.length,
      });
      return;
    }

    // Next card
    flipAnim.setValue(0);
    setFlipped(false);
    setSameBoatStat(null);
    setIndex(next);
  };

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (cards.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <Icon name="deck" size={iconSize.hero} color={theme.textMuted} style={styles.emptyIcon} />
        <Text style={styles.emptyText}>This deck has no cards yet.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <View style={styles.exitRow}>
            <Icon name="close" size={iconSize.sm} color={theme.textSecondary} />
            <Text style={styles.exitText}>Exit</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.progressText}>
          {index + 1} / {cards.length}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[styles.progressFill, { width: `${((index) / cards.length) * 100}%` }]}
        />
      </View>

      {/* Deck title */}
      <Text style={styles.deckTitle}>{deckTitle}</Text>

      {/* Card */}
      <View style={styles.cardArea}>
        {/* Front (question) */}
        <Animated.View
          style={[
            styles.card,
            styles.cardFront,
            { transform: [{ rotateY: frontInterpolate }] },
          ]}
          pointerEvents={flipped ? 'none' : 'auto'}
        >
          <Text style={styles.cardLabel}>TERM</Text>
          <Text style={styles.cardText}>{currentCard?.front || ''}</Text>
          <TouchableOpacity style={styles.tapHint} onPress={handleFlip} activeOpacity={0.8}>
            <Text style={styles.tapHintText}>Tap to reveal →</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Back (answer) */}
        <Animated.View
          style={[
            styles.card,
            styles.cardBack,
            { transform: [{ rotateY: backInterpolate }] },
          ]}
          pointerEvents={flipped ? 'auto' : 'none'}
        >
          <Text style={styles.cardLabel}>DEFINITION</Text>
          <Text style={styles.cardText}>{currentCard?.back || ''}</Text>
        </Animated.View>
      </View>

      {/* Same-Boat stat (shown after flip) */}
      {flipped && <SameBoatBanner stat={sameBoatStat} styles={styles} theme={theme} />}

      {/* Answer buttons (shown after flip) */}
      {flipped && (
        <View style={styles.answerRow}>
          <TouchableOpacity
            style={[styles.answerBtn, styles.answerBtnWrong]}
            onPress={() => handleAnswer(false)}
            activeOpacity={0.85}
          >
            <Icon name="wrong" size={iconSize.md} color={theme.dangerText} />
            <Text style={styles.answerBtnText}>Didn't know</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.answerBtn, styles.answerBtnRight]}
            onPress={() => handleAnswer(true)}
            activeOpacity={0.85}
          >
            <Icon name="check" size={iconSize.md} color={theme.successText} />
            <Text style={styles.answerBtnText}>Knew it</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.background,
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  exitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  exitText: { fontSize: 14, color: theme.textSecondary, fontWeight: '600' },
  progressText: { fontSize: 14, color: theme.textSecondary, fontWeight: '600' },

  progressTrack: {
    height: 3,
    backgroundColor: theme.border,
    marginHorizontal: spacing.xl,
    borderRadius: 2,
  },
  progressFill: {
    height: 3,
    backgroundColor: theme.primary,
    borderRadius: 2,
  },

  deckTitle: {
    fontSize: 13,
    color: theme.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    position: 'absolute',
    width: SCREEN_W - 40,
    minHeight: 220,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
    borderWidth: 1,
    borderColor: theme.border,
    ...elevation.raised,
  },
  cardFront: { backgroundColor: theme.card },
  cardBack: { backgroundColor: theme.primaryLight },
  cardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.lg,
  },
  cardText: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.text,
    textAlign: 'center',
    lineHeight: 32,
  },
  tapHint: { marginTop: spacing.xxl },
  tapHintText: { fontSize: 13, color: theme.primary, fontWeight: '600' },

  sameBoatBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.md,
  },
  sameBoatTextWrap: { flex: 1 },
  sameBoatMessage: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  sameBoatAttempts: { fontSize: 12, color: theme.textMuted, marginTop: 2 },

  answerRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  answerBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.card,
  },
  answerBtnWrong: {
    backgroundColor: theme.dangerBg,
    borderWidth: 1.5,
    borderColor: theme.danger,
  },
  answerBtnRight: {
    backgroundColor: theme.successBg,
    borderWidth: 1.5,
    borderColor: theme.success,
  },
  answerBtnText: { fontSize: 15, fontWeight: '700', color: theme.text },

  emptyIcon: { marginBottom: spacing.md },
  emptyText: { fontSize: 16, color: theme.textSecondary, marginBottom: spacing.lg },
  backLink: { fontSize: 15, color: theme.primary, fontWeight: '600' },
});
