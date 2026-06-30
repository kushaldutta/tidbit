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

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Same-Boat banner ────────────────────────────────────────────────────────

function SameBoatBanner({ stat }) {
  if (!stat || stat.attempts < 2) return null;

  const pct = stat.pctCorrect ?? 0;
  const wrongPct = Math.round(100 - pct);
  let message, emoji, bg, textColor;

  if (wrongPct >= 60) {
    message = `${wrongPct}% of your classmates got this wrong too`;
    emoji = '🤝';
    bg = '#fef2f2';
    textColor = '#991b1b';
  } else if (wrongPct >= 30) {
    message = `${Math.round(pct)}% of your classmates got this right`;
    emoji = '📊';
    bg = '#fffbeb';
    textColor = '#92400e';
  } else {
    message = `${Math.round(pct)}% of your classmates got this right — tricky one?`;
    emoji = '🏆';
    bg = '#f0fdf4';
    textColor = '#166534';
  }

  return (
    <View style={[styles.sameBoatBanner, { backgroundColor: bg }]}>
      <Text style={styles.sameBoatEmoji}>{emoji}</Text>
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
        <ActivityIndicator color="#6366f1" />
      </SafeAreaView>
    );
  }

  if (cards.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyEmoji}>📭</Text>
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
          <Text style={styles.exitText}>✕ Exit</Text>
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
      {flipped && <SameBoatBanner stat={sameBoatStat} />}

      {/* Answer buttons (shown after flip) */}
      {flipped && (
        <View style={styles.answerRow}>
          <TouchableOpacity
            style={[styles.answerBtn, styles.answerBtnWrong]}
            onPress={() => handleAnswer(false)}
            activeOpacity={0.85}
          >
            <Text style={styles.answerBtnText}>✗  Didn't know</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.answerBtn, styles.answerBtnRight]}
            onPress={() => handleAnswer(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.answerBtnText}>✓  Knew it</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  exitText: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  progressText: { fontSize: 14, color: '#374151', fontWeight: '600' },

  progressTrack: {
    height: 3,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 20,
    borderRadius: 2,
  },
  progressFill: {
    height: 3,
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },

  deckTitle: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    position: 'absolute',
    width: SCREEN_W - 40,
    minHeight: 220,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  cardFront: { backgroundColor: '#fff' },
  cardBack: { backgroundColor: '#eef2ff' },
  cardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  cardText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 32,
  },
  tapHint: { marginTop: 28 },
  tapHintText: { fontSize: 13, color: '#6366f1', fontWeight: '600' },

  sameBoatBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  sameBoatEmoji: { fontSize: 24 },
  sameBoatTextWrap: { flex: 1 },
  sameBoatMessage: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  sameBoatAttempts: { fontSize: 12, color: '#9ca3af', marginTop: 2 },

  answerRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  answerBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  answerBtnWrong: { backgroundColor: '#fef2f2', borderWidth: 1.5, borderColor: '#fca5a5' },
  answerBtnRight: { backgroundColor: '#f0fdf4', borderWidth: 1.5, borderColor: '#86efac' },
  answerBtnText: { fontSize: 15, fontWeight: '700', color: '#374151' },

  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#6b7280', marginBottom: 16 },
  backLink: { fontSize: 15, color: '#6366f1', fontWeight: '600' },
});
