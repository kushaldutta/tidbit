import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthService } from '../services/AuthService';
import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import API_CONFIG from '../config/api';
import PremiumGate from '../components/PremiumGate';

const AI_MONTHLY_QUOTA = 30;

const MODES = [
  { id: 'text_prompt', emoji: '💬', label: 'Topic prompt', hint: 'e.g. "CS161 public key cryptography — RSA, Diffie-Hellman, digital signatures"' },
  { id: 'paste_notes', emoji: '📋', label: 'Paste notes', hint: 'Paste lecture notes, a textbook excerpt, or any raw text' },
];

function QuotaBadge({ used, limit }) {
  const remaining = limit - used;
  const pct = used / limit;
  const color = pct >= 0.9 ? '#dc2626' : pct >= 0.7 ? '#f59e0b' : '#16a34a';
  return (
    <View style={styles.quotaBadge}>
      <View style={styles.quotaBar}>
        <View style={[styles.quotaFill, { width: `${Math.min(pct * 100, 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.quotaText, { color }]}>
        {remaining} generation{remaining !== 1 ? 's' : ''} left this month
      </Text>
    </View>
  );
}

function CardPreview({ cards }) {
  const spinAnim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(spinAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={{ opacity: spinAnim }}>
      <Text style={styles.previewHeader}>
        ✨ {cards.length} cards generated
      </Text>
      {cards.slice(0, 5).map((c, i) => (
        <View key={i} style={styles.previewCard}>
          <Text style={styles.previewFront}>{c.front}</Text>
          <View style={styles.previewDivider} />
          <Text style={styles.previewBack}>{c.back}</Text>
        </View>
      ))}
      {cards.length > 5 && (
        <Text style={styles.moreCards}>+ {cards.length - 5} more cards</Text>
      )}
    </Animated.View>
  );
}

function AIGenerationScreenInner({ navigation }) {
  const [mode, setMode] = useState('text_prompt');
  const [prompt, setPrompt] = useState('');
  const [deckTitle, setDeckTitle] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState(null);
  const [generatedDeckId, setGeneratedDeckId] = useState(null);
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [used, setUsed] = useState(0);

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    if (!SUPABASE_CONFIGURED) return;
    const userId = AuthService.getUserId();
    if (!userId) return;
    const startOfMonth = new Date();
    startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('ai_generation_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString());
    setUsed(count ?? 0);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert('Enter a prompt', 'Describe a topic or paste your notes to generate cards.');
      return;
    }
    if (used >= AI_MONTHLY_QUOTA) {
      Alert.alert('Monthly limit reached', `You've used all ${AI_MONTHLY_QUOTA} AI generations this month. Resets on the 1st.`);
      return;
    }

    setGenerating(true);
    setGeneratedCards(null);

    try {
      const userId = AuthService.getUserId();
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/ai/generate-deck`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          mode,
          prompt: prompt.trim(),
          deckTitle: deckTitle.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          Alert.alert('Monthly limit reached', `You've used all ${AI_MONTHLY_QUOTA} AI generations this month.`);
        } else {
          Alert.alert('Generation failed', data.error || 'Something went wrong. Please try again.');
        }
        return;
      }

      setGeneratedCards(data.cards);
      setGeneratedDeckId(data.deckId);
      setGeneratedTitle(data.title);
      setUsed((u) => u + 1);
    } catch (err) {
      Alert.alert('Error', 'Could not reach the server. Check your connection and try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleStudyDeck = () => {
    navigation.navigate('DeckEditor', {
      deckId: generatedDeckId,
      mode: 'edit',
    });
  };

  const handleGenerateAnother = () => {
    setGeneratedCards(null);
    setGeneratedDeckId(null);
    setGeneratedTitle('');
    setPrompt('');
    setDeckTitle('');
  };

  const currentMode = MODES.find(m => m.id === mode);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Deck Generator</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <QuotaBadge used={used} limit={AI_MONTHLY_QUOTA} />

          {!generatedCards ? (
            <>
              {/* Mode selector */}
              <Text style={styles.sectionLabel}>Mode</Text>
              <View style={styles.modeRow}>
                {MODES.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.modeChip, mode === m.id && styles.modeChipActive]}
                    onPress={() => setMode(m.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modeEmoji}>{m.emoji}</Text>
                    <Text style={[styles.modeLabel, mode === m.id && styles.modeLabelActive]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Prompt input */}
              <Text style={styles.sectionLabel}>
                {mode === 'text_prompt' ? 'Topic' : 'Your notes'}
              </Text>
              <TextInput
                style={[styles.promptInput, mode === 'paste_notes' && styles.promptInputTall]}
                placeholder={currentMode.hint}
                placeholderTextColor="#9ca3af"
                value={prompt}
                onChangeText={setPrompt}
                multiline
                textAlignVertical="top"
              />

              {/* Optional title */}
              <Text style={styles.sectionLabel}>Deck title <Text style={styles.optional}>(optional)</Text></Text>
              <TextInput
                style={styles.titleInput}
                placeholder="Leave blank to auto-generate"
                placeholderTextColor="#9ca3af"
                value={deckTitle}
                onChangeText={setDeckTitle}
              />

              {/* Generate button */}
              <TouchableOpacity
                style={[styles.generateBtn, (!prompt.trim() || generating) && styles.generateBtnDisabled]}
                onPress={handleGenerate}
                disabled={!prompt.trim() || generating}
                activeOpacity={0.85}
              >
                {generating ? (
                  <View style={styles.generatingRow}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.generateBtnText}>  Generating cards…</Text>
                  </View>
                ) : (
                  <Text style={styles.generateBtnText}>✨ Generate Deck</Text>
                )}
              </TouchableOpacity>

              {generating && (
                <Text style={styles.generatingHint}>
                  Usually takes 3–6 seconds. Don't close the app.
                </Text>
              )}

              {/* Snap-a-Page shortcut */}
              <TouchableOpacity
                style={styles.snapLink}
                onPress={() => navigation.navigate('SnapPage')}
                activeOpacity={0.8}
              >
                <Text style={styles.snapLinkText}>📸 Have a photo instead? Try Snap-a-Page →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Success state */}
              <View style={styles.successBanner}>
                <Text style={styles.successEmoji}>🎉</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.successTitle}>{generatedTitle}</Text>
                  <Text style={styles.successSub}>Saved to your decks</Text>
                </View>
              </View>

              <CardPreview cards={generatedCards} />

              <TouchableOpacity style={styles.studyBtn} onPress={handleStudyDeck} activeOpacity={0.85}>
                <Text style={styles.studyBtnText}>View & edit deck →</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.anotherBtn} onPress={handleGenerateAnother} activeOpacity={0.8}>
                <Text style={styles.anotherBtnText}>✨ Generate another</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function AIGenerationScreen({ navigation, route }) {
  return (
    <PremiumGate navigation={navigation} feature="AI Deck Generation">
      <AIGenerationScreenInner navigation={navigation} route={route} />
    </PremiumGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backText: { fontSize: 15, color: '#6366f1', fontWeight: '600', width: 60 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },

  scroll: { padding: 20, paddingBottom: 60 },

  quotaBadge: { marginBottom: 20 },
  quotaBar: {
    height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, marginBottom: 6, overflow: 'hidden',
  },
  quotaFill: { height: 6, borderRadius: 3 },
  quotaText: { fontSize: 12, fontWeight: '600' },

  sectionLabel: {
    fontSize: 12, fontWeight: '800', color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 20,
  },
  optional: { fontWeight: '400', textTransform: 'none', letterSpacing: 0 },

  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  modeChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 2, borderColor: '#e5e7eb',
  },
  modeChipActive: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  modeEmoji: { fontSize: 20 },
  modeLabel: { fontSize: 13, fontWeight: '600', color: '#6b7280', flex: 1 },
  modeLabelActive: { color: '#4338ca' },

  promptInput: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 2, borderColor: '#e5e7eb',
    padding: 16, fontSize: 15, color: '#111827', minHeight: 100, textAlignVertical: 'top',
  },
  promptInputTall: { minHeight: 160 },

  titleInput: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 2, borderColor: '#e5e7eb',
    padding: 16, fontSize: 15, color: '#111827',
  },

  generateBtn: {
    backgroundColor: '#6366f1', borderRadius: 16, paddingVertical: 17,
    alignItems: 'center', marginTop: 28,
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  generateBtnDisabled: { backgroundColor: '#a5b4fc', shadowOpacity: 0 },
  generateBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  generatingRow: { flexDirection: 'row', alignItems: 'center' },
  generatingHint: { textAlign: 'center', color: '#9ca3af', fontSize: 13, marginTop: 12 },

  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#f0fdf4', borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: '#86efac', marginBottom: 20,
  },
  successEmoji: { fontSize: 32 },
  successTitle: { fontSize: 16, fontWeight: '800', color: '#166534', marginBottom: 2 },
  successSub: { fontSize: 13, color: '#16a34a' },

  previewHeader: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12 },
  previewCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  previewFront: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 8 },
  previewDivider: { height: 1, backgroundColor: '#f3f4f6', marginBottom: 8 },
  previewBack: { fontSize: 13, color: '#6b7280', lineHeight: 20 },
  moreCards: { fontSize: 13, color: '#9ca3af', textAlign: 'center', marginTop: 4, marginBottom: 16 },

  studyBtn: {
    backgroundColor: '#6366f1', borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', marginTop: 8, marginBottom: 12,
  },
  studyBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  anotherBtn: {
    backgroundColor: '#eef2ff', borderRadius: 16, paddingVertical: 14, alignItems: 'center',
  },
  anotherBtnText: { color: '#4338ca', fontWeight: '700', fontSize: 15 },
  snapLink: { marginTop: 20, alignItems: 'center' },
  snapLinkText: { fontSize: 13, color: '#6366f1', fontWeight: '600' },
});
