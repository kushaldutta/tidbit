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
        <ActivityIndicator color="#6366f1" />
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
          <Text style={styles.createCardEmoji}>＋</Text>
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
            {/* AI generation entry point */}
            <TouchableOpacity
              style={styles.aiBtn}
              onPress={() => navigation.navigate('AIGeneration')}
              activeOpacity={0.85}
            >
              <Text style={styles.aiBtnEmoji}>🤖</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.aiBtnTitle}>Generate with AI</Text>
                <Text style={styles.aiBtnSub}>Turn a topic or notes into a full deck instantly</Text>
              </View>
              <Text style={styles.aiBtnArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.aiBtn, { backgroundColor: '#1a0a2e', marginTop: 10 }]}
              onPress={() => navigation.navigate('SnapPage')}
              activeOpacity={0.85}
            >
              <Text style={styles.aiBtnEmoji}>📸</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.aiBtnTitle}>Snap-a-Page</Text>
                <Text style={styles.aiBtnSub}>Photo your notes → instant flashcards</Text>
              </View>
              <Text style={styles.aiBtnArrow}>›</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  list: { padding: 16, paddingBottom: 48 },
  header: { marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: theme.text },
  subtitle: { fontSize: 14, color: theme.textSecondary, marginTop: 4, marginBottom: 16 },
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#0f0a2e', borderRadius: 16, padding: 16, marginTop: 4,
  },
  aiBtnEmoji: { fontSize: 28 },
  aiBtnTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 2 },
  aiBtnSub: { fontSize: 12, color: '#a5b4fc' },
  aiBtnArrow: { fontSize: 24, color: '#a5b4fc', fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: { fontSize: 13, color: theme.textSecondary, fontWeight: '600' },
  deckCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  deckCardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deckActions: {
    flexDirection: 'column',
    gap: 6,
    marginLeft: 8,
  },
  learnBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  learnBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  deleteBtn: {
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  deleteBtnText: { color: '#dc2626', fontSize: 12, fontWeight: '600' },
  deckEmoji: { fontSize: 32, marginRight: 14 },
  deckTitle: { fontSize: 16, fontWeight: '600', color: theme.text },
  deckDescription: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
  deckMeta: { fontSize: 12, color: theme.textSecondary, marginTop: 4 },
  createCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#c7d2fe',
    borderStyle: 'dashed',
  },
  createCardEmoji: {
    fontSize: 36,
    color: '#6366f1',
    marginRight: 14,
    fontWeight: '300',
  },
  createCardTitle: { fontSize: 16, fontWeight: '600', color: '#4338ca' },
  createCardSubtitle: { fontSize: 13, color: '#6366f1', marginTop: 2 },
});
