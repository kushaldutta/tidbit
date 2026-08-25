/**
 * LearnModePickerScreen
 *
 * Entry point for interactive study modes (W7).
 * Shows the user's decks plus preset class decks for enrolled classes.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { StudyDeckService } from '../services/StudyDeckService';
import { ClassService } from '../services/ClassService';
import { ContentService } from '../services/ContentService';
import { StorageService } from '../services/StorageService';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/Icon';
import { iconSize, radius } from '../theme/tokens';

/**
 * `accent` identifies the mode at a glance. It tints the icon only — the card
 * itself stays on the neutral surface. Four full-bleed pastel cards gave the eye
 * nowhere to land; a tinted 40pt icon square keeps the colour cue without the shouting.
 */
const MODES = [
  {
    id: 'Quiz',
    icon: 'quiz',
    title: 'Quiz',
    subtitle: 'Multiple choice · rate your confidence',
    accent: '#6366f1',
    accentBg: '#eef2ff',
    minCards: 2,
  },
  {
    id: 'Recall',
    icon: 'recall',
    title: 'Recall',
    subtitle: 'Type the term · fuzzy matching · audio mode',
    accent: '#8b5cf6',
    accentBg: '#f5f3ff',
    minCards: 1,
  },
  {
    id: 'Match',
    icon: 'match',
    title: 'Match',
    subtitle: 'Tap-to-pair game · race the clock · leaderboard',
    accent: '#f59e0b',
    accentBg: '#fffbeb',
    minCards: 2,
  },
  {
    id: 'SpeedRun',
    icon: 'speedRun',
    title: 'Speed Run',
    subtitle: '60 or 90s blitz · how many can you get?',
    accent: '#ef4444',
    accentBg: '#fef2f2',
    minCards: 2,
  },
];

function ModeCard({ mode, onPress, disabled, styles, theme }) {
  return (
    <TouchableOpacity
      style={[styles.modeCard, disabled && styles.modeCardDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <View style={styles.modeCardLeft}>
        <View style={[styles.modeIconWrap, { backgroundColor: mode.accentBg }]}>
          <Icon name={mode.icon} size={iconSize.lg} color={mode.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.modeTitle}>{mode.title}</Text>
          <Text style={styles.modeSub}>{mode.subtitle}</Text>
        </View>
      </View>
      <Icon name="chevron" size={iconSize.md} color={theme.textMuted} />
    </TouchableOpacity>
  );
}

function DeckRow({ deck, selected, onPress, styles, theme }) {
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
      {selected && <Icon name="check" size={iconSize.md} color={theme.primary} />}
    </TouchableOpacity>
  );
}

function SectionToggleRow({ label, sublabel, selected, onPress, styles }) {
  return (
    <TouchableOpacity
      style={[styles.sectionRow, selected && styles.sectionRowSelected]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.sectionCheck, selected && styles.sectionCheckSelected]}>
        {selected && <Icon name="check" size={iconSize.sm} color="#fff" />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionRowTitle}>{label}</Text>
        {sublabel ? <Text style={styles.sectionRowSub}>{sublabel}</Text> : null}
      </View>
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
  const [deckSections, setDeckSections] = useState([]);
  const [allCards, setAllCards] = useState([]);
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [selectedSectionIds, setSelectedSectionIds] = useState([]);
  const [includeUncategorized, setIncludeUncategorized] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(!!preselectedDeckId);

  const studyScope = useMemo(() => {
    if (!deckSections.length) return null;
    return { sectionIds: selectedSectionIds, includeUncategorized };
  }, [deckSections.length, selectedSectionIds, includeUncategorized]);

  const scopedCardCount = useMemo(
    () => StudyDeckService.countCardsInScope(allCards, studyScope),
    [allCards, studyScope]
  );

  const loadDeckSections = useCallback(async (deckId) => {
    setSectionsLoading(true);
    try {
      const categoryId = ContentService.parseCategoryDeckId(deckId);
      if (categoryId) {
        const cards = ContentService.getStudyCardsForCategory(categoryId);
        setAllCards(cards);
        setDeckSections([]);
        setUncategorizedCount(0);
        setSelectedSectionIds([]);
        setIncludeUncategorized(false);
        return;
      }

      const [sections, cards, scope] = await Promise.all([
        DeckService.listSectionsWithCounts(deckId),
        DeckService.listCards(deckId),
        StudyDeckService.resolveStudyScope(deckId),
      ]);
      const active = sections.filter((s) => s.cardCount > 0);
      const uncategorized = cards.filter((c) => !c.section_id).length;

      setAllCards(cards);
      setUncategorizedCount(uncategorized);
      setDeckSections(active);

      if (!active.length) {
        setSelectedSectionIds([]);
        setIncludeUncategorized(false);
        return;
      }

      if (scope) {
        setSelectedSectionIds(scope.sectionIds || []);
        setIncludeUncategorized(!!scope.includeUncategorized);
      } else {
        setSelectedSectionIds(active.map((s) => s.id));
        setIncludeUncategorized(uncategorized > 0);
      }
    } finally {
      setSectionsLoading(false);
    }
  }, []);

  const persistStudyScope = useCallback(
    (sectionIds, uncategorized) => {
      if (!selectedDeck?.id || !deckSections.length) return;
      StudyDeckService.saveStudyScope(selectedDeck.id, {
        sectionIds,
        includeUncategorized: uncategorized,
      });
    },
    [selectedDeck?.id, deckSections.length]
  );

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

  useEffect(() => {
    if (!preselectedDeckId) return;
    (async () => {
      const deck = await DeckService.getDeck(preselectedDeckId);
      if (deck) {
        setSelectedDeck({
          id: deck.id,
          title: deck.title,
          cover_emoji: deck.cover_emoji,
          card_count: deck.card_count,
        });
      }
      await loadDeckSections(preselectedDeckId);
    })();
  }, [preselectedDeckId, loadDeckSections]);

  const handleDeckSelect = async (deck) => {
    setSelectedDeck(deck);
    setPhase('mode');
    await loadDeckSections(deck.id);
  };

  const toggleSection = (sectionId) => {
    setSelectedSectionIds((prev) => {
      const next = prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId];
      persistStudyScope(next, includeUncategorized);
      return next;
    });
  };

  const toggleUncategorized = () => {
    setIncludeUncategorized((prev) => {
      const next = !prev;
      persistStudyScope(selectedSectionIds, next);
      return next;
    });
  };

  const selectAllSections = () => {
    const allIds = deckSections.map((s) => s.id);
    const uncategorized = uncategorizedCount > 0;
    setSelectedSectionIds(allIds);
    setIncludeUncategorized(uncategorized);
    persistStudyScope(allIds, uncategorized);
  };

  const handleModeSelect = (mode) => {
    if (!selectedDeck) return;
    if (scopedCardCount < mode.minCards) return;
    navigation.navigate(mode.id, {
      deckId: selectedDeck.id,
      deckTitle: selectedDeck.title,
      studyScope,
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

  const allSectionsSelected =
    deckSections.length > 0 &&
    deckSections.every((s) => selectedSectionIds.includes(s.id)) &&
    (uncategorizedCount === 0 || includeUncategorized);

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
              <Icon name="deck" size={iconSize.hero} color={theme.textMuted} style={styles.emptyIcon} />
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
                    theme={theme}
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

          {sectionsLoading ? (
            <ActivityIndicator color={theme.primary} style={{ marginVertical: 16 }} />
          ) : deckSections.length > 0 ? (
            <View style={styles.sectionsBox}>
              <View style={styles.sectionsHeader}>
                <Text style={styles.sectionsTitle}>Sections</Text>
                {!allSectionsSelected && (
                  <TouchableOpacity onPress={selectAllSections} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.selectAllText}>Select all</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.sectionsSub}>
                {scopedCardCount} card{scopedCardCount === 1 ? '' : 's'} in this session
              </Text>
              {deckSections.map((section) => (
                <SectionToggleRow
                  key={section.id}
                  label={section.title}
                  sublabel={`${section.cardCount} card${section.cardCount === 1 ? '' : 's'}`}
                  selected={selectedSectionIds.includes(section.id)}
                  onPress={() => toggleSection(section.id)}
                  styles={styles}
                />
              ))}
              {uncategorizedCount > 0 && (
                <SectionToggleRow
                  label="Uncategorized"
                  sublabel={`${uncategorizedCount} card${uncategorizedCount === 1 ? '' : 's'}`}
                  selected={includeUncategorized}
                  onPress={toggleUncategorized}
                  styles={styles}
                />
              )}
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Choose a mode</Text>

          {MODES.map((m) => (
            <ModeCard
              key={m.id}
              mode={m}
              styles={styles}
              theme={theme}
              onPress={() => handleModeSelect(m)}
              disabled={scopedCardCount < m.minCards}
            />
          ))}

          {deckSections.length > 0 && scopedCardCount === 0 && (
            <Text style={styles.noCardsHint}>
              Select at least one section to start studying.
            </Text>
          )}

          <View style={styles.tipsBox}>
            <Text style={styles.tipsTitle}>Tips</Text>
            <Text style={styles.tipText}>• <Text style={{ fontWeight: '700' }}>Quiz</Text> — great first pass, builds recognition</Text>
            <Text style={styles.tipText}>• <Text style={{ fontWeight: '700' }}>Recall</Text> — harder, but better for long-term retention</Text>
            <Text style={styles.tipText}>• <Text style={{ fontWeight: '700' }}>Match</Text> — warm-up or review, good for speed</Text>
            <Text style={styles.tipText}>• <Text style={{ fontWeight: '700' }}>Speed Run</Text> — compete against classmates, type fast</Text>
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

  sectionsBox: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.primary,
  },
  sectionsSub: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 10,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  sectionRowSelected: {},
  sectionCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  sectionCheckSelected: {
    borderColor: theme.primary,
    backgroundColor: theme.primary,
  },
  sectionRowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
  },
  sectionRowSub: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  noCardsHint: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },

  modeCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.card,
    borderWidth: 1, borderColor: theme.border,
    borderRadius: radius.card, padding: 16, marginBottom: 10,
  },
  modeCardDisabled: { opacity: 0.45 },
  modeCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  modeIconWrap: {
    width: 44, height: 44, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  modeTitle: { fontSize: 17, fontWeight: '700', color: theme.text, marginBottom: 2 },
  modeSub: { fontSize: 13, color: theme.textSecondary, lineHeight: 18 },

  tipsBox: {
    backgroundColor: theme.primaryLight, borderRadius: 16, padding: 16, marginTop: 8,
  },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: theme.primary, marginBottom: 8 },
  tipText: { fontSize: 13, color: theme.text, lineHeight: 22 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: { marginBottom: 12 },
  emptyText: { fontSize: 16, color: theme.text, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  emptyLink: { fontSize: 15, color: theme.primary, fontWeight: '600' },
});
