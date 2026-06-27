import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  Modal,
  ScrollView,
  ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { DeckService } from '../../services/DeckService';
import { GroupService } from '../../services/GroupService';

const EMOJI_OPTIONS = ['📚', '🧠', '🔬', '🧪', '🧮', '📐', '🎨', '🌍', '⚡️', '💡', '🎯', '🏛️'];
const FILTER_ALL = 'all';
const FILTER_NONE = 'none';

export default function DeckEditorScreen({ route, navigation }) {
  const mode = route.params?.mode || 'create';
  const deckId = route.params?.deckId || null;
  const readOnly = mode === 'view';

  const [deck, setDeck] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverEmoji, setCoverEmoji] = useState('📚');
  const [cards, setCards] = useState([]);
  const [sections, setSections] = useState([]);
  const [sectionFilter, setSectionFilter] = useState(FILTER_ALL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [myGroups, setMyGroups] = useState([]);
  const [sharedGroupIds, setSharedGroupIds] = useState([]);
  const [sharingGroupId, setSharingGroupId] = useState(null);
  const [sectionsModalVisible, setSectionsModalVisible] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [sectionSaving, setSectionSaving] = useState(false);
  const [sectionChangingId, setSectionChangingId] = useState(null);

  const sectionById = useMemo(
    () => Object.fromEntries(sections.map((s) => [s.id, s])),
    [sections]
  );

  const uncategorizedCount = useMemo(
    () => cards.filter((c) => !c.section_id).length,
    [cards]
  );

  const filteredCards = useMemo(() => {
    if (sectionFilter === FILTER_ALL) return cards;
    if (sectionFilter === FILTER_NONE) return cards.filter((c) => !c.section_id);
    return cards.filter((c) => c.section_id === sectionFilter);
  }, [cards, sectionFilter]);

  const defaultSectionIdForNewCard = useMemo(() => {
    if (sectionFilter !== FILTER_ALL && sectionFilter !== FILTER_NONE) {
      return sectionFilter;
    }
    return null;
  }, [sectionFilter]);

  const load = useCallback(async () => {
    if (mode === 'create' || !deckId) {
      setLoading(false);
      return;
    }
    const [d, c, secs] = await Promise.all([
      DeckService.getDeck(deckId),
      DeckService.listCards(deckId),
      DeckService.listSections(deckId),
    ]);
    setDeck(d);
    setTitle(d?.title || '');
    setDescription(d?.description || '');
    setCoverEmoji(d?.cover_emoji || '📚');
    setCards(c);
    setSections(secs);
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
      sectionId: defaultSectionIdForNewCard,
      sections,
    });
  };

  const handleEditCard = (card) => {
    navigation.navigate('CardEditor', {
      deckId,
      cardId: card.id,
      mode: readOnly ? 'view' : 'edit',
      sectionId: card.section_id,
      sections,
    });
  };

  const handleAddSection = async () => {
    const trimmed = newSectionTitle.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Enter a section name.');
      return;
    }
    setSectionSaving(true);
    try {
      const created = await DeckService.createSection(deckId, { title: trimmed });
      setSections((prev) => [...prev, created]);
      setNewSectionTitle('');
      setSectionFilter(created.id);
    } catch (err) {
      Alert.alert('Could not add section', err.message || 'Try again.');
    } finally {
      setSectionSaving(false);
    }
  };

  const getCardSectionLabel = (card) => {
    if (!card.section_id) return 'Uncategorized';
    return sectionById[card.section_id]?.title || 'Uncategorized';
  };

  const handleChangeCardSection = async (card, sectionId) => {
    const nextId = sectionId || null;
    if (card.section_id === nextId) return;
    setSectionChangingId(card.id);
    try {
      await DeckService.updateCard(card.id, { sectionId: nextId });
      setCards((prev) =>
        prev.map((c) => (c.id === card.id ? { ...c, section_id: nextId } : c))
      );
    } catch (err) {
      Alert.alert('Could not update section', err.message || 'Try again.');
    } finally {
      setSectionChangingId(null);
    }
  };

  const openCardSectionPicker = (card) => {
    if (readOnly || !sections.length) return;

    const options = ['Uncategorized', ...sections.map((s) => s.title), 'Cancel'];
    const sectionIds = [null, ...sections.map((s) => s.id)];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          title: 'Move to section',
        },
        (index) => {
          if (index < 0 || index >= sectionIds.length) return;
          handleChangeCardSection(card, sectionIds[index]);
        }
      );
      return;
    }

    Alert.alert(
      'Move to section',
      undefined,
      [
        { text: 'Uncategorized', onPress: () => handleChangeCardSection(card, null) },
        ...sections.map((s) => ({
          text: s.title,
          onPress: () => handleChangeCardSection(card, s.id),
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleDeleteSection = (section) => {
    Alert.alert(
      'Delete section?',
      `"${section.title}" will be removed. Cards stay in the deck as uncategorized.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DeckService.deleteSection(section.id);
              setSections((prev) => prev.filter((s) => s.id !== section.id));
              setCards((prev) =>
                prev.map((c) =>
                  c.section_id === section.id ? { ...c, section_id: null } : c
                )
              );
              if (sectionFilter === section.id) setSectionFilter(FILTER_ALL);
            } catch (err) {
              Alert.alert('Could not delete section', err.message || 'Try again.');
            }
          },
        },
      ]
    );
  };

  const renderFilterChip = (key, label) => {
    const active = sectionFilter === key;
    return (
      <TouchableOpacity
        key={key}
        style={[styles.filterChip, active && styles.filterChipActive]}
        onPress={() => setSectionFilter(key)}
      >
        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
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
          data={filteredCards}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View>
              <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Text style={styles.back}>‹ Back</Text>
                </TouchableOpacity>
                {mode !== 'view' && (
                  <TouchableOpacity onPress={handleSaveMeta} disabled={saving}>
                    <Text style={[styles.saveLink, saving && styles.disabledText]}>
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
                  Cards · {filteredCards.length}
                  {sectionFilter !== FILTER_ALL ? ` of ${cards.length}` : ''}
                </Text>
                <View style={styles.cardsHeaderActions}>
                  {!readOnly && deckId && (
                    <TouchableOpacity
                      onPress={() => setSectionsModalVisible(true)}
                      style={styles.manageSectionsBtn}
                    >
                      <Text style={styles.manageSectionsText}>Sections</Text>
                    </TouchableOpacity>
                  )}
                  {!readOnly && deckId && (
                    <TouchableOpacity onPress={handleAddCard}>
                      <Text style={styles.addCardLink}>+ Add card</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {deckId && sections.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterRow}
                >
                  {renderFilterChip(FILTER_ALL, `All (${cards.length})`)}
                  {sections.map((s) => {
                    const count = cards.filter((c) => c.section_id === s.id).length;
                    return renderFilterChip(s.id, `${s.title} (${count})`);
                  })}
                  {renderFilterChip(FILTER_NONE, `Uncategorized (${uncategorizedCount})`)}
                </ScrollView>
              )}

              {!deckId && (
                <Text style={styles.helperText}>
                  Save the deck first, then add cards to it.
                </Text>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const sectionBusy = sectionChangingId === item.id;
            return (
              <View style={styles.cardRow}>
                {sections.length > 0 && !readOnly && (
                  <TouchableOpacity
                    style={styles.sectionPicker}
                    onPress={() => openCardSectionPicker(item)}
                    disabled={sectionBusy}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sectionPickerText} numberOfLines={1}>
                      {getCardSectionLabel(item)}
                    </Text>
                    {sectionBusy ? (
                      <ActivityIndicator size="small" color="#6366f1" />
                    ) : (
                      <Text style={styles.sectionPickerChevron}>▾</Text>
                    )}
                  </TouchableOpacity>
                )}
                {sections.length > 0 && readOnly && item.section_id && sectionById[item.section_id] && (
                  <Text style={styles.cardSectionLabel}>
                    {sectionById[item.section_id].title}
                  </Text>
                )}
                <TouchableOpacity
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
              </View>
            );
          }}
          ListEmptyComponent={
            deckId ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>
                  {sectionFilter === FILTER_ALL ? 'No cards yet' : 'No cards in this section'}
                </Text>
                <Text style={styles.emptyBody}>
                  {sectionFilter === FILTER_ALL
                    ? 'Tap “Add card” above to create your first one.'
                    : 'Add a card while this section filter is selected, or switch to All.'}
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
                                {group.code} · {group.memberCount} member
                                {group.memberCount !== 1 ? 's' : ''}
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
                <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteDeck}>
                  <Text style={styles.deleteButtonText}>Delete deck</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />

        <Modal
          visible={sectionsModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSectionsModalVisible(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Deck sections</Text>
              <TouchableOpacity onPress={() => setSectionsModalVisible(false)}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Organize cards by chapter, week, or topic. Cards can be filtered on this deck page.
            </Text>
            {!readOnly && (
              <View style={styles.addSectionRow}>
                <TextInput
                  style={styles.addSectionInput}
                  placeholder="New section name"
                  placeholderTextColor="#9ca3af"
                  value={newSectionTitle}
                  onChangeText={setNewSectionTitle}
                  editable={!sectionSaving}
                />
                <TouchableOpacity
                  style={[styles.addSectionBtn, sectionSaving && styles.disabledBtn]}
                  onPress={handleAddSection}
                  disabled={sectionSaving}
                >
                  <Text style={styles.addSectionBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
            <FlatList
              data={sections}
              keyExtractor={(s) => s.id}
              contentContainerStyle={styles.modalList}
              ListEmptyComponent={
                <Text style={styles.modalEmpty}>No sections yet. Add one above.</Text>
              }
              renderItem={({ item }) => {
                const count = cards.filter((c) => c.section_id === item.id).length;
                return (
                  <View style={styles.modalSectionRow}>
                    <View style={styles.modalSectionInfo}>
                      <Text style={styles.modalSectionTitle}>{item.title}</Text>
                      <Text style={styles.modalSectionMeta}>{count} cards</Text>
                    </View>
                    {!readOnly && (
                      <TouchableOpacity onPress={() => handleDeleteSection(item)}>
                        <Text style={styles.modalDelete}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />
          </SafeAreaView>
        </Modal>
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
  cardsHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  manageSectionsBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#eef2ff',
  },
  manageSectionsText: { color: '#4338ca', fontWeight: '600', fontSize: 13 },
  addCardLink: { color: '#6366f1', fontWeight: '600' },
  filterRow: { gap: 8, paddingBottom: 12 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: { backgroundColor: '#eef2ff', borderColor: '#6366f1' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  filterChipTextActive: { color: '#4338ca' },
  cardRow: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    marginBottom: 8,
  },
  sectionPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    marginBottom: 8,
  },
  sectionPickerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338ca',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  sectionPickerChevron: {
    fontSize: 11,
    color: '#6366f1',
    fontWeight: '700',
  },
  cardSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  cardFront: { fontSize: 15, color: '#111827', fontWeight: '500' },
  cardBack: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  empty: { padding: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
  emptyBody: { fontSize: 14, color: '#9ca3af', marginTop: 4, textAlign: 'center' },
  helperText: {
    color: '#6b7280',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 8,
  },
  shareSection: { marginTop: 32, marginBottom: 8 },
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
  modalContainer: { flex: 1, backgroundColor: '#f9fafb' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalDone: { fontSize: 16, fontWeight: '600', color: '#6366f1' },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    paddingHorizontal: 16,
    marginBottom: 16,
    lineHeight: 20,
  },
  addSectionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  addSectionInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  addSectionBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addSectionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  disabledBtn: { opacity: 0.5 },
  modalList: { paddingHorizontal: 16, paddingBottom: 24 },
  modalEmpty: { color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', marginTop: 24 },
  modalSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginBottom: 8,
  },
  modalSectionInfo: { flex: 1 },
  modalSectionTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  modalSectionMeta: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  modalDelete: { color: '#dc2626', fontWeight: '600', fontSize: 14 },
});
