/**
 * LearnModePickerScreen
 *
 * Entry point for interactive study modes (W7).
 * If a deckId is passed as a param, skip the deck picker and jump straight
 * to mode selection. Otherwise, show the user's decks first.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeckService } from '../services/DeckService';

const MODES = [
  {
    id: 'Quiz',
    emoji: '🧠',
    title: 'Quiz',
    subtitle: 'Multiple choice · rate your confidence',
    color: '#6366f1',
    bg: '#eef2ff',
    minCards: 2,
  },
  {
    id: 'Recall',
    emoji: '✏️',
    title: 'Recall',
    subtitle: 'Type the answer · fuzzy matching · audio mode',
    color: '#8b5cf6',
    bg: '#f5f3ff',
    minCards: 1,
  },
  {
    id: 'Match',
    emoji: '🧩',
    title: 'Match',
    subtitle: 'Tap-to-pair game · race the clock',
    color: '#f59e0b',
    bg: '#fffbeb',
    minCards: 2,
  },
];

function ModeCard({ mode, onPress, disabled }) {
  return (
    <TouchableOpacity
      style={[styles.modeCard, { backgroundColor: mode.bg, opacity: disabled ? 0.45 : 1 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <View style={styles.modeCardLeft}>
        <Text style={styles.modeEmoji}>{mode.emoji}</Text>
        <View>
          <Text style={[styles.modeTitle, { color: mode.color }]}>{mode.title}</Text>
          <Text style={styles.modeSub}>{mode.subtitle}</Text>
        </View>
      </View>
      <Text style={[styles.modeArrow, { color: mode.color }]}>›</Text>
    </TouchableOpacity>
  );
}

function DeckRow({ deck, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.deckRow, selected && styles.deckRowSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.deckEmoji}>{deck.cover_emoji || '📚'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.deckTitle} numberOfLines={1}>{deck.title}</Text>
        <Text style={styles.deckSub}>{deck.card_count ?? 0} cards</Text>
      </View>
      {selected && <Text style={styles.deckCheck}>✓</Text>}
    </TouchableOpacity>
  );
}

export default function LearnModePickerScreen({ route, navigation }) {
  const preselectedDeckId = route.params?.deckId;
  const preselectedTitle = route.params?.deckTitle;

  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(!preselectedDeckId);
  const [selectedDeck, setSelectedDeck] = useState(
    preselectedDeckId
      ? { id: preselectedDeckId, title: preselectedTitle, card_count: null }
      : null
  );
  const [phase, setPhase] = useState(preselectedDeckId ? 'mode' : 'deck'); // 'deck' | 'mode'

  useEffect(() => {
    if (preselectedDeckId) return;
    DeckService.listMyDecks().then((d) => {
      setDecks(d);
      setLoading(false);
    });
  }, []);

  const handleDeckSelect = (deck) => {
    setSelectedDeck(deck);
    setPhase('mode');
  };

  const handleModeSelect = (mode) => {
    if (!selectedDeck) return;
    navigation.navigate(mode.id, {
      deckId: selectedDeck.id,
      deckTitle: selectedDeck.title,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (phase === 'mode' && !preselectedDeckId) {
            setPhase('deck');
          } else {
            navigation.goBack();
          }
        }}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Learn</Text>
        <View style={{ width: 48 }} />
      </View>

      {phase === 'deck' ? (
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Pick a deck</Text>
          {loading ? (
            <ActivityIndicator color="#6366f1" style={{ marginTop: 40 }} />
          ) : decks.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyText}>You don't have any decks yet.</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Decks')}>
                <Text style={styles.emptyLink}>Create a deck →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={decks}
              keyExtractor={(d) => d.id}
              contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
              renderItem={({ item }) => (
                <DeckRow
                  deck={item}
                  selected={selectedDeck?.id === item.id}
                  onPress={() => handleDeckSelect(item)}
                />
              )}
            />
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.modeScroll}>
          {/* Selected deck badge */}
          <View style={styles.selectedDeckBadge}>
            <Text style={styles.selectedDeckEmoji}>{selectedDeck?.cover_emoji || '📚'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedDeckLabel}>Studying</Text>
              <Text style={styles.selectedDeckTitle} numberOfLines={1}>{selectedDeck?.title}</Text>
            </View>
            {!preselectedDeckId && (
              <TouchableOpacity onPress={() => setPhase('deck')}>
                <Text style={styles.changeDeckText}>Change</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.sectionTitle}>Choose a mode</Text>

          {MODES.map((m) => (
            <ModeCard
              key={m.id}
              mode={m}
              onPress={() => handleModeSelect(m)}
              disabled={selectedDeck?.card_count !== null && selectedDeck?.card_count < m.minCards}
            />
          ))}

          <View style={styles.tipsBox}>
            <Text style={styles.tipsTitle}>💡 Tips</Text>
            <Text style={styles.tipText}>• <Text style={{ fontWeight: '700' }}>Quiz</Text> — great first pass, builds recognition</Text>
            <Text style={styles.tipText}>• <Text style={{ fontWeight: '700' }}>Recall</Text> — harder, but better for long-term retention</Text>
            <Text style={styles.tipText}>• <Text style={{ fontWeight: '700' }}>Match</Text> — warm-up or review, good for speed</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backText: { fontSize: 15, color: '#6366f1', fontWeight: '600', width: 48 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },

  sectionTitle: {
    fontSize: 13, fontWeight: '800', color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: 1,
    marginHorizontal: 20, marginTop: 20, marginBottom: 12,
  },

  deckRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 10, borderWidth: 2, borderColor: '#f3f4f6',
  },
  deckRowSelected: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  deckEmoji: { fontSize: 24 },
  deckTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  deckSub: { fontSize: 12, color: '#9ca3af' },
  deckCheck: { fontSize: 18, color: '#6366f1', fontWeight: '800' },

  modeScroll: { padding: 20, paddingBottom: 48 },

  selectedDeckBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 8, borderWidth: 2, borderColor: '#e5e7eb',
  },
  selectedDeckEmoji: { fontSize: 24 },
  selectedDeckLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  selectedDeckTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  changeDeckText: { fontSize: 13, color: '#6366f1', fontWeight: '600' },

  modeCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, padding: 20, marginBottom: 12,
  },
  modeCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  modeEmoji: { fontSize: 32 },
  modeTitle: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  modeSub: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  modeArrow: { fontSize: 28, fontWeight: '700' },

  tipsBox: {
    backgroundColor: '#f0f9ff', borderRadius: 16, padding: 16, marginTop: 8,
  },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: '#0369a1', marginBottom: 8 },
  tipText: { fontSize: 13, color: '#374151', lineHeight: 22 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#6b7280', marginBottom: 12 },
  emptyLink: { fontSize: 15, color: '#6366f1', fontWeight: '600' },
});
