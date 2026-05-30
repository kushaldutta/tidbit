import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { DeckService } from '../../services/DeckService';
import { GroupService } from '../../services/GroupService';

const EMOJI_OPTIONS = ['📚', '🧠', '🔬', '🧪', '🧮', '📐', '🎨', '🌍', '⚡️', '💡', '🎯', '🏛️'];

export default function DeckEditorScreen({ route, navigation }) {
  const mode = route.params?.mode || 'create'; // 'create' | 'edit' | 'view'
  const deckId = route.params?.deckId || null;
  const readOnly = mode === 'view';

  const [deck, setDeck] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverEmoji, setCoverEmoji] = useState('📚');
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [myGroups, setMyGroups] = useState([]);
  const [sharedGroupIds, setSharedGroupIds] = useState([]);
  const [sharingGroupId, setSharingGroupId] = useState(null);

  const load = useCallback(async () => {
    if (mode === 'create' || !deckId) {
      setLoading(false);
      return;
    }
    const [d, c] = await Promise.all([
      DeckService.getDeck(deckId),
      DeckService.listCards(deckId),
    ]);
    setDeck(d);
    setTitle(d?.title || '');
    setDescription(d?.description || '');
    setCoverEmoji(d?.cover_emoji || '📚');
    setCards(c);
    // Load groups + current share state in parallel
    const [groups, sharedIds] = await Promise.all([
      GroupService.getMyGroups(),
      DeckService.getSharedGroupIds(deckId),
    ]);
    setMyGroups(groups);
    setSharedGroupIds(sharedIds);
    setLoading(false);
  }, [mode, deckId]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        if (alive) setLoading(true);
        await load();
      })();
      return () => {
        alive = false;
      };
    }, [load])
  );

  const handleSaveMeta = async () => {
    if (!title.trim()) {
      Alert.alert('Add a title', 'Decks need a name.');
      return;
    }
    setSaving(true);
    try {
      if (mode === 'create') {
        const created = await DeckService.createDeck({
          title,
          description,
          coverEmoji,
        });
        navigation.replace('DeckEditor', {
          mode: 'edit',
          deckId: created.id,
        });
      } else {
        await DeckService.updateDeck(deckId, {
          title,
          description,
          coverEmoji,
        });
        Alert.alert('Saved', 'Deck updated.');
      }
    } catch (err) {
      Alert.alert('Could not save', err.message || 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDeck = () => {
    Alert.alert(
      'Delete this deck?',
      'This removes all cards and study progress in this deck. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DeckService.deleteDeck(deckId);
              navigation.goBack();
            } catch (err) {
              Alert.alert('Could not delete', err.message || 'Try again.');
            }
          },
        },
      ]
    );
  };

  const handleToggleShare = async (group) => {
    const isShared = sharedGroupIds.includes(group.groupId);
    setSharingGroupId(group.groupId);
    try {
      if (isShared) {
        await DeckService.unshareDeckFromGroup(deckId, group.groupId);
        setSharedGroupIds((prev) => prev.filter((id) => id !== group.groupId));
      } else {
        await DeckService.shareDeckToGroup(deckId, group.groupId);
        setSharedGroupIds((prev) => [...prev, group.groupId]);
      }
    } catch (err) {
      Alert.alert('Could not update share', err.message || 'Try again.');
    } finally {
      setSharingGroupId(null);
    }
  };

  const handleAddCard = () => {
    navigation.navigate('CardEditor', {
      deckId: deckId || deck?.id,
      mode: 'create',
    });
  };

  const handleEditCard = (card) => {
    navigation.navigate('CardEditor', {
      deckId,
      cardId: card.id,
      mode: readOnly ? 'view' : 'edit',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color="#6366f1" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <FlatList
          data={cards}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View>
              <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Text style={styles.back}>‹ Back</Text>
                </TouchableOpacity>
                {mode !== 'view' && (
                  <TouchableOpacity
                    onPress={handleSaveMeta}
                    disabled={saving}
                  >
                    <Text
                      style={[styles.saveLink, saving && styles.disabledText]}
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.heading}>
                {mode === 'create' ? 'New deck' : title || 'Deck'}
              </Text>

              <Text style={styles.label}>Cover</Text>
              <View style={styles.emojiRow}>
                {EMOJI_OPTIONS.map((e) => (
                  <TouchableOpacity
                    key={e}
                    style={[
                      styles.emojiChip,
                      coverEmoji === e && styles.emojiChipActive,
                    ]}
                    onPress={() => setCoverEmoji(e)}
                    disabled={readOnly}
                  >
                    <Text style={styles.emojiChipText}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. CS61A Midterm 2 vocabulary"
                placeholderTextColor="#9ca3af"
                value={title}
                onChangeText={setTitle}
                editable={!readOnly && !saving}
              />

              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="What's in this deck?"
                placeholderTextColor="#9ca3af"
                value={description}
                onChangeText={setDescription}
                multiline
                editable={!readOnly && !saving}
              />

              <View style={styles.cardsHeader}>
                <Text style={styles.cardsHeaderTitle}>
                  Cards · {cards.length}
                </Text>
                {!readOnly && deckId && (
                  <TouchableOpacity onPress={handleAddCard}>
                    <Text style={styles.addCardLink}>+ Add card</Text>
                  </TouchableOpacity>
                )}
              </View>

              {!deckId && (
                <Text style={styles.helperText}>
                  Save the deck first, then add cards to it.
                </Text>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.cardRow}
              onPress={() => handleEditCard(item)}
              activeOpacity={0.85}
            >
              <Text style={styles.cardFront} numberOfLines={2}>
                {item.front}
              </Text>
              <Text style={styles.cardBack} numberOfLines={2}>
                {item.back}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            deckId ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No cards yet</Text>
                <Text style={styles.emptyBody}>
                  Tap “Add card” above to create your first one.
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            mode === 'edit' && deckId ? (
              <View>
                {myGroups.length > 0 && (
                  <View style={styles.shareSection}>
                    <Text style={styles.shareSectionTitle}>Share with class groups</Text>
                    {myGroups.map((group) => {
                      const isShared = sharedGroupIds.includes(group.groupId);
                      const isBusy = sharingGroupId === group.groupId;
                      return (
                        <TouchableOpacity
                          key={group.groupId}
                          style={styles.shareRow}
                          onPress={() => handleToggleShare(group)}
                          disabled={isBusy}
                          activeOpacity={0.75}
                        >
                          <View style={styles.shareRowLeft}>
                            <Text style={styles.shareGroupEmoji}>👥</Text>
                            <View>
                              <Text style={styles.shareGroupName}>{group.title}</Text>
                              <Text style={styles.shareGroupMeta}>
                                {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                              </Text>
                            </View>
                          </View>
                          {isBusy ? (
                            <ActivityIndicator size="small" color="#6366f1" />
                          ) : (
                            <View
                              style={[
                                styles.shareToggle,
                                isShared && styles.shareToggleActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.shareToggleText,
                                  isShared && styles.shareToggleTextActive,
                                ]}
                              >
                                {isShared ? 'Shared ✓' : 'Share'}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                <TouchableOpacity
                  style={styles.learnBtn}
                  onPress={() => navigation.navigate('LearnModePicker', { deckId, deckTitle: title })}
                  activeOpacity={0.85}
                >
                  <Text style={styles.learnBtnText}>🎯 Learn this deck</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDeleteDeck}
                >
                  <Text style={styles.deleteButtonText}>Delete deck</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 48 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  back: { color: '#6366f1', fontSize: 16, fontWeight: '500' },
  saveLink: { color: '#6366f1', fontSize: 16, fontWeight: '600' },
  disabledText: { opacity: 0.5 },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginVertical: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  inputMultiline: { minHeight: 64, textAlignVertical: 'top' },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiChip: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiChipActive: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  emojiChipText: { fontSize: 22 },
  cardsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 12,
  },
  cardsHeaderTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  addCardLink: { color: '#6366f1', fontWeight: '600' },
  cardRow: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    marginBottom: 8,
  },
  cardFront: { fontSize: 15, color: '#111827', fontWeight: '500' },
  cardBack: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  empty: { padding: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
  emptyBody: { fontSize: 14, color: '#9ca3af', marginTop: 4 },
  helperText: {
    color: '#6b7280',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 8,
  },
  shareSection: {
    marginTop: 32,
    marginBottom: 8,
  },
  shareSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  shareRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  shareGroupEmoji: { fontSize: 22 },
  shareGroupName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  shareGroupMeta: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  shareToggle: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#6366f1',
    backgroundColor: '#fff',
  },
  shareToggleActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  shareToggleText: { fontSize: 13, fontWeight: '600', color: '#6366f1' },
  shareToggleTextActive: { color: '#fff' },
  learnBtn: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    borderWidth: 1.5,
    borderColor: '#c7d2fe',
  },
  learnBtnText: { color: '#4338ca', fontWeight: '700', fontSize: 15 },
  deleteButton: {
    marginTop: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  deleteButtonText: { color: '#dc2626', fontWeight: '600', fontSize: 15 },
});
