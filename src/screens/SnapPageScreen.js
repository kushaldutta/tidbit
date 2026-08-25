import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { AuthService } from '../services/AuthService';
import API_CONFIG from '../config/api';
import PremiumGate from '../components/PremiumGate';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/Icon';
import { spacing, radius, iconSize } from '../theme/tokens';

const MAX_PAGES = 6;

function SnapPageInner({ navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [imageUris, setImageUris] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState(null);
  const [generatedDeckId, setGeneratedDeckId] = useState(null);
  const [generatedTitle, setGeneratedTitle] = useState('');

  const addImages = (assets) => {
    const uris = assets.map((a) => a.uri).filter(Boolean);
    if (!uris.length) return;
    setImageUris((prev) => {
      const merged = [...prev, ...uris].slice(0, MAX_PAGES);
      if (prev.length + uris.length > MAX_PAGES) {
        Alert.alert('Page limit', `You can add up to ${MAX_PAGES} pages at a time.`);
      }
      return merged;
    });
    setGeneratedCards(null);
  };

  const openCamera = async () => {
    if (imageUris.length >= MAX_PAGES) {
      Alert.alert('Page limit', `Maximum ${MAX_PAGES} pages per deck.`);
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera permission needed', 'Please allow camera access in Settings to use Snap-a-Page.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.3,
    });
    if (!result.canceled && result.assets?.[0]) {
      addImages(result.assets);
    }
  };

  const openLibrary = async () => {
    if (imageUris.length >= MAX_PAGES) {
      Alert.alert('Page limit', `Maximum ${MAX_PAGES} pages per deck.`);
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Photo library permission needed', 'Please allow photo access in Settings.');
      return;
    }
    const remaining = MAX_PAGES - imageUris.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.3,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (!result.canceled && result.assets?.length) {
      addImages(result.assets);
    }
  };

  const removeImage = (index) => {
    setImageUris((prev) => prev.filter((_, i) => i !== index));
    setGeneratedCards(null);
  };

  const handleGenerate = async () => {
    if (imageUris.length === 0) return;
    setGenerating(true);

    try {
      const userId = AuthService.getUserId();
      const imagesBase64 = [];

      for (const uri of imageUris) {
        const manipulated = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 900 } }],
          { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        if (manipulated.base64) imagesBase64.push(manipulated.base64);
      }

      if (imagesBase64.length === 0) {
        Alert.alert('Error', 'Could not process the selected images.');
        return;
      }

      const pageCount = imagesBase64.length;
      const timeoutMs = Math.min(120000, 45000 + pageCount * 15000);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(`${API_CONFIG.BASE_URL}/api/ai/generate-deck`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          userId,
          mode: 'snap_page',
          prompt: `Extract term-and-definition cards from these ${pageCount} page(s).`,
          imagesBase64,
          imageBase64: imagesBase64[0],
        }),
      });
      clearTimeout(timeout);

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          Alert.alert('Monthly limit reached', "You've used all 30 AI generations this month.");
        } else {
          Alert.alert('Generation failed', data.error || 'Something went wrong. Try again.');
        }
        return;
      }

      setGeneratedCards(data.cards);
      setGeneratedDeckId(data.deckId);
      setGeneratedTitle(data.title);
    } catch (err) {
      if (err.name === 'AbortError') {
        Alert.alert('Took too long', 'The request timed out. Try fewer pages or clearer photos.');
      } else {
        Alert.alert('Error', 'Could not reach the server. Check your connection and try again.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleViewDeck = () => {
    navigation.navigate('DeckEditor', { deckId: generatedDeckId, mode: 'edit' });
  };

  const handleReset = () => {
    setImageUris([]);
    setGeneratedCards(null);
    setGeneratedDeckId(null);
    setGeneratedTitle('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Snap-a-Page</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!generatedCards ? (
          <>
            <View style={styles.hero}>
              <Icon name="snap" size={iconSize.hero} color={theme.primary} style={styles.heroIcon} />
              <Text style={styles.heroTitle}>Photo to flashcards</Text>
              <Text style={styles.heroSub}>
                Add up to {MAX_PAGES} pages from notes or a textbook. AI scales card count with how many pages you submit (~30 cards per page).
              </Text>
            </View>

            {imageUris.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewRow}>
                {imageUris.map((uri, index) => (
                  <View key={`${uri}-${index}`} style={styles.previewWrap}>
                    <Image source={{ uri }} style={styles.previewImage} resizeMode="cover" />
                    <TouchableOpacity style={styles.retakeBtn} onPress={() => removeImage(index)}>
                      <Icon name="close" size={iconSize.sm} color={theme.danger} />
                    </TouchableOpacity>
                    <Text style={styles.pageLabel}>Page {index + 1}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.imagePlaceholder}>
                <Icon name="snap" size={iconSize.xl} color={theme.textMuted} style={styles.placeholderIcon} />
                <Text style={styles.placeholderText}>No pages selected</Text>
              </View>
            )}

            <Text style={styles.pageCountText}>
              {imageUris.length}/{MAX_PAGES} pages selected
            </Text>

            <View style={styles.pickRow}>
              <TouchableOpacity
                style={[styles.pickBtn, imageUris.length >= MAX_PAGES && styles.pickBtnDisabled]}
                onPress={openCamera}
                disabled={imageUris.length >= MAX_PAGES}
                activeOpacity={0.8}
              >
                <Icon name="snap" size={iconSize.lg} color={theme.primary} />
                <Text style={styles.pickBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pickBtn, imageUris.length >= MAX_PAGES && styles.pickBtnDisabled]}
                onPress={openLibrary}
                disabled={imageUris.length >= MAX_PAGES}
                activeOpacity={0.8}
              >
                <Icon name="decks" size={iconSize.lg} color={theme.primary} />
                <Text style={styles.pickBtnText}>Add photos</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.generateBtn, (imageUris.length === 0 || generating) && styles.generateBtnDisabled]}
              onPress={handleGenerate}
              disabled={imageUris.length === 0 || generating}
              activeOpacity={0.85}
            >
              {generating ? (
                <View style={styles.generatingRow}>
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text style={styles.generateBtnText}>Analysing {imageUris.length} page{imageUris.length === 1 ? '' : 's'}…</Text>
                </View>
              ) : (
                <Text style={styles.generateBtnText}>Generate Cards</Text>
              )}
            </TouchableOpacity>

            {generating && (
              <Text style={styles.generatingHint}>
                Vision AI is reading your pages. This may take 10–30 seconds for multiple pages.
              </Text>
            )}
          </>
        ) : (
          <>
            <View style={styles.successBanner}>
              <Icon name="check" size={iconSize.lg} color={theme.success} filled style={styles.successIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.successTitle}>{generatedTitle}</Text>
                <Text style={styles.successSub}>
                  {generatedCards.length} cards generated from {imageUris.length} page{imageUris.length === 1 ? '' : 's'}
                </Text>
              </View>
            </View>

            {generatedCards.slice(0, 6).map((c, i) => (
              <View key={i} style={styles.cardRow}>
                <Text style={styles.cardFront}>{c.front}</Text>
                <Text style={styles.cardBack}>{c.back}</Text>
              </View>
            ))}
            {generatedCards.length > 6 && (
              <Text style={styles.moreCards}>+ {generatedCards.length - 6} more cards</Text>
            )}

            <TouchableOpacity style={styles.studyBtn} onPress={handleViewDeck} activeOpacity={0.85}>
              <Text style={styles.studyBtnText}>View & edit deck</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.anotherBtn} onPress={handleReset} activeOpacity={0.8}>
              <Text style={styles.anotherBtnText}>Snap more pages</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function SnapPageScreen({ navigation, route }) {
  return (
    <PremiumGate navigation={navigation} feature="Snap-a-Page">
      <SnapPageInner navigation={navigation} route={route} />
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
    backgroundColor: theme.card,
  },
  backText: { fontSize: 15, color: theme.primary, fontWeight: '600', width: 60 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.text },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },

  hero: { alignItems: 'center', marginBottom: spacing.xxl },
  heroIcon: { marginBottom: spacing.md },
  heroTitle: { fontSize: 24, fontWeight: '700', color: theme.text, marginBottom: spacing.sm },
  heroSub: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 21 },

  previewRow: { gap: spacing.md, paddingBottom: spacing.sm },
  previewWrap: { width: 160, alignItems: 'center' },
  previewImage: { width: 160, height: 210, borderRadius: radius.md, backgroundColor: theme.card },
  retakeBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: theme.dangerBg,
    borderRadius: radius.pill,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.danger,
  },
  pageLabel: { marginTop: spacing.sm, fontSize: 12, color: theme.textSecondary, fontWeight: '600' },

  imagePlaceholder: {
    height: 160,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: theme.borderStrong,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    backgroundColor: theme.card,
  },
  placeholderIcon: { marginBottom: spacing.sm },
  placeholderText: { color: theme.textMuted, fontSize: 14 },
  pageCountText: {
    textAlign: 'center',
    color: theme.textSecondary,
    fontSize: 13,
    marginBottom: spacing.lg,
  },

  pickRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  pickBtn: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  pickBtnDisabled: { opacity: 0.45 },
  pickBtnText: { fontSize: 13, fontWeight: '600', color: theme.text },

  generateBtn: {
    backgroundColor: theme.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  generateBtnDisabled: { backgroundColor: theme.accent },
  generateBtnText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
  generatingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  generatingHint: {
    textAlign: 'center',
    color: theme.textMuted,
    fontSize: 13,
    marginTop: spacing.md,
  },

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

  cardRow: {
    backgroundColor: theme.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardFront: { fontSize: 14, fontWeight: '600', color: theme.text, marginBottom: spacing.xs },
  cardBack: { fontSize: 13, color: theme.textSecondary },
  moreCards: {
    fontSize: 13,
    color: theme.textMuted,
    textAlign: 'center',
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
