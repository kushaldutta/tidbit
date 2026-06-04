/**
 * LearnModePickerScreen
 *
 * Entry point for interactive study modes (W7).
 * Shows the user's decks plus preset class decks for enrolled classes.
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
import { ClassService } from '../services/ClassService';
import { ContentService } from '../services/ContentService';
import { StorageService } from '../services/StorageService';
import { useTheme } from '../context/ThemeContext';

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

function ModeCard({ mode, onPress, disabled, styles }) {
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

function DeckRow({ deck, selected, onPress, styles }) {
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
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const preselectedDeckId = route.params?.deckId;
  const preselectedTitle = route.params?.deckTitle;

  const [myDecks, setMyDecks] = useState([]);
  const [classDecks, setClassDecks] = useState([]);
  const [loading, setLoading] = useState(!preselectedDeckId);
  const [selectedDeck, setSelectedDeck] = useState(
    preselectedDeckId
      ? { id: preselectedDeckId, title: preselectedTitle, card_count: null }
      : null
  );
  const [phase, setPhase] = useState(preselectedDeckId ? 'mode' : 'deck');

  useEffect(() => {
    if (preselectedDeckId) return;
    (async () => {
      const [mine, presets, classIds, selectedCats] = await Promise.all([
        DeckService.listMyDecks(),
        DeckService.listPresetDecks(),
        ClassService.getMyClassIds(),
        StorageService.getSelectedCategories(),
      ]);
      const categoryIds = new Set([
        ...ClassService.categoryIdsForClasses(classIds),
        ...selectedCats,
      ]);
      const enrolled = new Set(classIds);
      const matchedPresets = presets.filter(
        (p) =>
          (p.slug && categoryIds.has(p.slug)) ||
          (p.class_id && enrolled.has(p.class_id))
      );
      setMyDecks(mine);
      setClassDecks(ContentService.buildClassStudyDecks(categoryIds, matchedPresets));
      setLoading(false);
    })();
  }, [preselectedDeckId]);

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

  const deckListData = [
    ...(myDecks.length > 0
      ? [{ type: 'section', title: 'My decks' }, ...myDecks.map((d) => ({ type: 'deck', deck: d }))]
      : []),
    ...(classDecks.length > 0
      ? [{ type: 'section', title: 'Class decks' }, ...classDecks.map((d) => ({ type: 'deck', deck: d }))]
      : []),
  ];

  return (
    <SafeAreaView style={styles.container}>
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
            <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
          ) : deckListData.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyText}>No decks available yet.</Text>
              <Text style={styles.emptySubtext}>
                Enroll in classes on the Categories tab or create your own deck.
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('MyDecks')}>
                <Text style={styles.emptyLink}>Go to My Decks →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={deckListData}
              keyExtractor={(item, idx) =>
                item.type === 'section' ? `s-${item.title}` : item.deck.id
              }
              contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
              renderItem={({ item }) => {
                if (item.type === 'section') {
                  return (
                    <Text style={styles.listSectionTitle}>{item.title}</Text>
                  );
                }
                return (
                  <DeckRow
                    deck={item.deck}
                    selected={selectedDeck?.id === item.deck.id}
                    onPress={() => handleDeckSelect(item.deck)}
                    styles={styles}
                  />
                );
              }}
            />
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.modeScroll}>
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
              styles={styles}
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

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
    backgroundColor: theme.card,
  },
  backText: { fontSize: 15, color: theme.primary, fontWeight: '600', width: 48 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: theme.text },

  sectionTitle: {
    fontSize: 13, fontWeight: '800', color: theme.textSecondary,
    textTransform: 'uppercase', letterSpacing: 1,
    marginHorizontal: 20, marginTop: 20, marginBottom: 12,
  },
  listSectionTitle: {
    fontSize: 12, fontWeight: '800', color: theme.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: 16, marginBottom: 8, marginLeft: 4,
  },

  deckRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    marginBottom: 10, borderWidth: 2, borderColor: '#f3f4f6',
  },
  deckRowSelected: { borderColor: theme.primary, backgroundColor: theme.primaryLight },
  deckEmoji: { fontSize: 24 },
  deckTitle: { fontSize: 15, fontWeight: '700', color: theme.text, marginBottom: 2 },
  deckSub: { fontSize: 12, color: theme.textSecondary },
  deckCheck: { fontSize: 18, color: theme.primary, fontWeight: '800' },

  modeScroll: { padding: 20, paddingBottom: 48 },

  selectedDeckBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    marginBottom: 8, borderWidth: 2, borderColor: '#e5e7eb',
  },
  selectedDeckEmoji: { fontSize: 24 },
  selectedDeckLabel: { fontSize: 11, color: theme.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  selectedDeckTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
  changeDeckText: { fontSize: 13, color: theme.primary, fontWeight: '600' },

  modeCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, padding: 20, marginBottom: 12,
  },
  modeCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  modeEmoji: { fontSize: 32 },
  modeTitle: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  modeSub: { fontSize: 13, color: theme.textSecondary, lineHeight: 18 },
  modeArrow: { fontSize: 28, fontWeight: '700' },

  tipsBox: {
    backgroundColor: theme.primaryLight, borderRadius: 16, padding: 16, marginTop: 8,
  },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: theme.primary, marginBottom: 8 },
  tipText: { fontSize: 13, color: theme.text, lineHeight: 22 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, color: theme.text, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  emptyLink: { fontSize: 15, color: theme.primary, fontWeight: '600' },
});
