import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { DeckService } from '../../services/DeckService';
import { useTheme } from '../../context/ThemeContext';
import Icon from '../../components/Icon';
import NavRow from '../../components/NavRow';
import { spacing, radius, iconSize } from '../../theme/tokens';

export default function MyDecksScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [myDecks, setMyDecks] = useState([]);
  const [presetDecks, setPresetDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef(null);
  const scrollOffsetRef = useRef(0);
  const isFirstLoadRef = useRef(true);
  const pendingScrollRestoreRef = useRef(false);

  const load = useCallback(async () => {
    const [mine, preset] = await Promise.all([
      DeckService.listMyDecks(),
      DeckService.listEnrolledPresetDecks(),
    ]);
    setMyDecks(mine);
    setPresetDecks(preset);
  }, []);

  const restoreScroll = useCallback(() => {
    const offset = scrollOffsetRef.current;
    if (offset <= 0) return;
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({ offset, animated: false });
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const isFirstLoad = isFirstLoadRef.current;
        if (isFirstLoad) setLoading(true);
        await load();
        if (!alive) return;
        if (isFirstLoad) {
          isFirstLoadRef.current = false;
          setLoading(false);
        } else {
          pendingScrollRestoreRef.current = true;
        }
      })();
      return () => {
        alive = false;
      };
    }, [load])
  );

  useEffect(() => {
    if (!pendingScrollRestoreRef.current) return;
    pendingScrollRestoreRef.current = false;
    restoreScroll();
  }, [myDecks, presetDecks, restoreScroll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleDeleteDeck = (deck) => {
    Alert.alert(
      'Delete this deck?',
      `"${deck.title}" and all its cards will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DeckService.deleteDeck(deck.id);
              await load();
            } catch (e) {
              Alert.alert('Could not delete deck', e.message || 'Try again.');
            }
          },
        },
      ]
    );
  };

  const handleLearnDeck = (deck) => {
    navigation.navigate('LearnModePicker', { deckId: deck.id, deckTitle: deck.title });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </SafeAreaView>
    );
  }

  const data = [
    { type: 'section', title: 'My decks', countLabel: `${myDecks.length}` },
    ...myDecks.map((d) => ({ type: 'deck', deck: d, isMine: true })),
    { type: 'create' },
    ...(presetDecks.length > 0
      ? [
          {
            type: 'section',
            title: 'Preset decks',
            countLabel: `${presetDecks.length}`,
          },
          ...presetDecks.map((d) => ({ type: 'deck', deck: d, isMine: false })),
        ]
      : []),
  ];

  const renderItem = ({ item }) => {
    if (item.type === 'section') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{item.title}</Text>
          <Text style={styles.sectionCount}>{item.countLabel}</Text>
        </View>
      );
    }
    if (item.type === 'create') {
      return (
        <TouchableOpacity
          style={styles.createCard}
          onPress={() =>
            navigation.navigate('DeckEditor', { mode: 'create' })
          }
          activeOpacity={0.85}
        >
          <Icon name="add" size={iconSize.lg} color={theme.primary} style={styles.createCardIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.createCardTitle}>Create a deck</Text>
            <Text style={styles.createCardSubtitle}>
              Build your own flashcards from scratch
            </Text>
          </View>
        </TouchableOpacity>
      );
    }
    const d = item.deck;
    return (
      <View style={styles.deckCard}>
        <TouchableOpacity
          style={styles.deckCardMain}
          onPress={() =>
            navigation.navigate('DeckEditor', {
              mode: item.isMine ? 'edit' : 'view',
              deckId: d.id,
            })
          }
          activeOpacity={0.85}
        >
          <Text style={styles.deckEmoji}>{d.cover_emoji || '📚'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.deckTitle} numberOfLines={1}>
              {d.title}
            </Text>
            {d.description ? (
              <Text style={styles.deckDescription} numberOfLines={1}>
                {d.description}
              </Text>
            ) : null}
            <Text style={styles.deckMeta}>
              {d.card_count || 0} card{d.card_count === 1 ? '' : 's'}
              {d.is_premium_generated ? ' • AI generated' : ''}
              {!item.isMine ? ' • Preset' : ''}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.deckActions}>
          {(d.card_count || 0) > 0 && (
            <TouchableOpacity
              style={styles.learnBtn}
              onPress={() => handleLearnDeck(d)}
              activeOpacity={0.7}
            >
              <Text style={styles.learnBtnText}>Learn</Text>
            </TouchableOpacity>
          )}
          {item.isMine && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDeleteDeck(d)}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={data}
        renderItem={renderItem}
        onScroll={(e) => {
          scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        keyExtractor={(item, idx) => {
          if (item.type === 'section') return `s-${item.title}`;
          if (item.type === 'create') return 'create';
          return item.deck.id;
        }}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Decks</Text>
            <Text style={styles.subtitle}>
              Your custom decks and curated preset decks for your classes.
            </Text>
            <NavRow
              icon="ai"
              title="Generate with AI"
              sub="Turn a topic or notes into a full deck"
              onPress={() => navigation.navigate('AIGeneration')}
              tone="accent"
            />
            <NavRow
              icon="snap"
              title="Snap-a-Page"
              sub="Photograph your notes to get flashcards"
              onPress={() => navigation.navigate('SnapPage')}
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  },
  list: { padding: spacing.xl, paddingBottom: spacing.xxxl },

  header: { marginBottom: spacing.sm },
  title: { fontSize: 42, fontWeight: 'bold', color: theme.text, marginBottom: spacing.sm },
  subtitle: { fontSize: 16, color: theme.textSecondary, marginBottom: spacing.xl },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionCount: { fontSize: 13, color: theme.textMuted, fontWeight: '600' },

  deckCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    padding: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
  },
  deckCardMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  deckActions: { flexDirection: 'column', gap: spacing.sm, marginLeft: spacing.sm },
  learnBtn: {
    backgroundColor: theme.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  learnBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  deleteBtn: {
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: theme.danger,
    backgroundColor: theme.dangerBg,
  },
  deleteBtnText: { color: theme.danger, fontSize: 12, fontWeight: '600' },
  // Deck cover emoji are user-chosen content, not UI icons — they stay emoji.
  deckEmoji: { fontSize: 32, marginRight: spacing.lg },
  deckTitle: { fontSize: 16, fontWeight: '600', color: theme.text },
  deckDescription: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
  deckMeta: { fontSize: 12, color: theme.textMuted, marginTop: spacing.xs },

  createCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primaryLight,
    padding: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: theme.accent,
    borderStyle: 'dashed',
  },
  createCardIcon: { marginRight: spacing.md },
  createCardTitle: { fontSize: 16, fontWeight: '600', color: theme.primary },
  createCardSubtitle: { fontSize: 13, color: theme.primary, marginTop: 2 },
});
