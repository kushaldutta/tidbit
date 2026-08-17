import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../config/supabase';
import { DeckService } from '../../services/DeckService';
import { useTheme } from '../../context/ThemeContext';

export default function CardEditorScreen({ route, navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { deckId, cardId, mode, sectionId: initialSectionId, sections: routeSections } =
    route.params || {};
  const isCreate = mode === 'create' || !cardId;
  const readOnly = mode === 'view';

  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [sections, setSections] = useState(routeSections || []);
  const [selectedSectionId, setSelectedSectionId] = useState(initialSectionId || null);
  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (routeSections?.length) {
      setSections(routeSections);
      return;
    }
    if (!deckId) return;
    DeckService.listSections(deckId).then(setSections);
  }, [deckId, routeSections]);

  useEffect(() => {
    if (isCreate) return;
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('id', cardId)
        .maybeSingle();
      if (error) {
        Alert.alert('Could not load card', error.message);
        return;
      }
      if (alive && data) {
        setFront(data.front);
        setBack(data.back);
        setSelectedSectionId(data.section_id || null);
      }
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [isCreate, cardId]);

  const handleSave = async () => {
    if (!front.trim() || !back.trim()) {
      Alert.alert('Fill both sides', 'Front and back are both required.');
      return;
    }
    setSaving(true);
    try {
      if (isCreate) {
        await DeckService.addCard(deckId, {
          front,
          back,
          sectionId: selectedSectionId,
        });
      } else {
        await DeckService.updateCard(cardId, {
          front,
          back,
          sectionId: selectedSectionId,
        });
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Could not save card', err.message || 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete this card?', 'Cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await DeckService.deleteCard(cardId);
            navigation.goBack();
          } catch (err) {
            Alert.alert('Could not delete', err.message || 'Try again.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.back}>‹ Cancel</Text>
            </TouchableOpacity>
            {!readOnly && (
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                <Text style={[styles.saveLink, saving && styles.disabledText]}>
                  {saving ? 'Saving…' : isCreate ? 'Add' : 'Save'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.heading}>
            {isCreate ? 'New card' : readOnly ? 'Card' : 'Edit card'}
          </Text>

          {sections.length > 0 && (
            <>
              <Text style={styles.label}>Section</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sectionRow}
              >
                <TouchableOpacity
                  style={[
                    styles.sectionChip,
                    !selectedSectionId && styles.sectionChipActive,
                  ]}
                  onPress={() => !readOnly && setSelectedSectionId(null)}
                  disabled={readOnly}
                >
                  <Text
                    style={[
                      styles.sectionChipText,
                      !selectedSectionId && styles.sectionChipTextActive,
                    ]}
                  >
                    None
                  </Text>
                </TouchableOpacity>
                {sections.map((s) => {
                  const active = selectedSectionId === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.sectionChip, active && styles.sectionChipActive]}
                      onPress={() => !readOnly && setSelectedSectionId(s.id)}
                      disabled={readOnly}
                    >
                      <Text
                        style={[
                          styles.sectionChipText,
                          active && styles.sectionChipTextActive,
                        ]}
                      >
                        {s.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          <Text style={styles.label}>Front (prompt)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="What is the question or term?"
            placeholderTextColor={theme.textMuted}
            value={front}
            onChangeText={setFront}
            multiline
            editable={!readOnly && !saving}
          />

          <Text style={styles.label}>Back (answer)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="What is the answer or definition?"
            placeholderTextColor={theme.textMuted}
            value={back}
            onChangeText={setBack}
            multiline
            editable={!readOnly && !saving}
          />

          {!isCreate && !readOnly && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>Delete card</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surfaceAlt },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 48 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  back: { color: theme.primary, fontSize: 16, fontWeight: '500' },
  saveLink: { color: theme.primary, fontSize: 16, fontWeight: '600' },
  disabledText: { opacity: 0.5 },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.text,
    marginVertical: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionRow: { gap: 8, paddingBottom: 4 },
  sectionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sectionChipActive: { backgroundColor: theme.primaryLight, borderColor: theme.primary },
  sectionChipText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  sectionChipTextActive: { color: theme.primaryDark },
  input: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.text,
  },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  deleteButton: {
    marginTop: 32,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.danger,
    backgroundColor: theme.dangerBg,
  },
  deleteButtonText: { color: theme.danger, fontWeight: '600', fontSize: 15 },
});
