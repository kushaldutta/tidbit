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
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/Icon';
import { spacing, radius, iconSize } from '../theme/tokens';

const AI_MONTHLY_QUOTA = 30;

const MODES = [
  { id: 'text_prompt', icon: 'edit', label: 'Topic prompt', hint: 'e.g. "CS161 public key cryptography — RSA, Diffie-Hellman, digital signatures"' },
  { id: 'paste_notes', icon: 'studyPlan', label: 'Paste notes', hint: 'Paste lecture notes, a textbook excerpt, or any raw text' },
];

function QuotaBadge({ used, limit, styles, theme }) {
  const remaining = limit - used;
  const pct = used / limit;
  const color = pct >= 0.9 ? theme.danger : pct >= 0.7 ? theme.warning : theme.success;
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

function CardPreview({ cards, styles }) {
  const spinAnim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(spinAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={{ opacity: spinAnim }}>
      <Text style={styles.previewHeader}>{cards.length} cards generated</Text>
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
  const { theme } = useTheme();
  const styles = makeStyles(theme);
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
          <QuotaBadge used={used} limit={AI_MONTHLY_QUOTA} styles={styles} theme={theme} />

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
                    <Icon
                      name={m.icon}
                      size={iconSize.md}
                      color={mode === m.id ? theme.primary : theme.textSecondary}
                    />
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
                placeholderTextColor={theme.textMuted}
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
                placeholderTextColor={theme.textMuted}
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
                    <ActivityIndicator color="#ffffff" size="small" />
                    <Text style={styles.generateBtnText}>Generating cards…</Text>
                  </View>
                ) : (
                  <Text style={styles.generateBtnText}>Generate Deck</Text>
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
                <Icon name="snap" size={iconSize.md} color={theme.primary} />
                <Text style={styles.snapLinkText}>Have a photo instead? Try Snap-a-Page</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Success state */}
              <View style={styles.successBanner}>
                <Icon name="check" size={iconSize.lg} color={theme.success} filled style={styles.successIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.successTitle}>{generatedTitle}</Text>
                  <Text style={styles.successSub}>Saved to your decks</Text>
                </View>
              </View>

              <CardPreview cards={generatedCards} styles={styles} />

              <TouchableOpacity style={styles.studyBtn} onPress={handleStudyDeck} activeOpacity={0.85}>
                <Text style={styles.studyBtnText}>View & edit deck</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.anotherBtn} onPress={handleGenerateAnother} activeOpacity={0.8}>
                <Text style={styles.anotherBtnText}>Generate another</Text>
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

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backText: { fontSize: 15, color: theme.primary, fontWeight: '600', width: 60 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.text },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },

  quotaBadge: { marginBottom: spacing.xl },
  quotaBar: {
    height: 6,
    backgroundColor: theme.surfaceAlt,
    borderRadius: radius.sm / 2,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  quotaFill: { height: 6, borderRadius: radius.sm / 2 },
  quotaText: { fontSize: 12, fontWeight: '700' },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  optional: { fontWeight: '400', color: theme.textMuted, textTransform: 'none', letterSpacing: 0 },

  modeRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  modeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: theme.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  modeChipActive: { borderColor: theme.primary, backgroundColor: theme.primaryLight },
  modeLabel: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, flex: 1 },
  modeLabelActive: { color: theme.primary },

  promptInput: {
    backgroundColor: theme.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    padding: spacing.lg,
    fontSize: 15,
    color: theme.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.xl,
  },
  promptInputTall: { minHeight: 180 },
  titleInput: {
    backgroundColor: theme.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    padding: spacing.lg,
    fontSize: 15,
    color: theme.text,
    marginBottom: spacing.xl,
  },

  generateBtn: {
    backgroundColor: theme.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  generateBtnDisabled: { backgroundColor: theme.accent },
  generateBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  generatingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  generatingHint: {
    textAlign: 'center',
    color: theme.textMuted,
    fontSize: 13,
    marginTop: spacing.md,
  },

  snapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  snapLinkText: { fontSize: 14, color: theme.primary, fontWeight: '600' },

  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.successBg,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: theme.success,
    marginBottom: spacing.xl,
  },
  successIcon: { marginRight: spacing.md },
  successTitle: { fontSize: 16, fontWeight: '700', color: theme.successText, marginBottom: 2 },
  successSub: { fontSize: 13, color: theme.successText },

  previewHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
    marginBottom: spacing.md,
  },
  previewCard: {
    backgroundColor: theme.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
  },
  previewFront: { fontSize: 14, fontWeight: '600', color: theme.text, marginBottom: spacing.sm },
  previewDivider: { height: 1, backgroundColor: theme.border, marginBottom: spacing.sm },
  previewBack: { fontSize: 13, color: theme.textSecondary, lineHeight: 19 },
  moreCards: {
    fontSize: 13,
    color: theme.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },

  studyBtn: {
    backgroundColor: theme.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  studyBtnText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
  anotherBtn: {
    backgroundColor: theme.primaryLight,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.accent,
  },
  anotherBtnText: { color: theme.primary, fontWeight: '600', fontSize: 15 },
});
