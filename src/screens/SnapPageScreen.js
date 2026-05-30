import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { AuthService } from '../services/AuthService';
import API_CONFIG from '../config/api';
import PremiumGate from '../components/PremiumGate';

function SnapPageInner({ navigation }) {
  const [imageUri, setImageUri] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState(null);
  const [generatedDeckId, setGeneratedDeckId] = useState(null);
  const [generatedTitle, setGeneratedTitle] = useState('');

  const openCamera = async () => {
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
      setImageUri(result.assets[0].uri);
      setGeneratedCards(null);
    }
  };

  const openLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Photo library permission needed', 'Please allow photo access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.3,
    });
    if (!result.canceled && result.assets?.[0]) {
      setImageUri(result.assets[0].uri);
      setGeneratedCards(null);
    }
  };

  const handleGenerate = async () => {
    if (!imageUri) return;
    setGenerating(true);

    try {
      const userId = AuthService.getUserId();

      // Resize to max 900px and compress — keeps payload well under 200KB
      const manipulated = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 900 } }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      const base64 = manipulated.base64;
      console.log(`[SnapPage] Compressed image base64 length: ${base64?.length}`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);

      const res = await fetch(`${API_CONFIG.BASE_URL}/api/ai/generate-deck`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          userId,
          mode: 'snap_page',
          prompt: 'Generate flashcards from this page.',
          imageBase64: base64,
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
        Alert.alert('Took too long', 'The request timed out. Try a clearer, well-lit photo and try again.');
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
    setImageUri(null);
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
              <Text style={styles.heroEmoji}>📸</Text>
              <Text style={styles.heroTitle}>Photo → Flashcards</Text>
              <Text style={styles.heroSub}>
                Photograph a textbook page, handwritten notes, or a slide. AI extracts every concept into a study-ready deck.
              </Text>
            </View>

            {/* Image preview or placeholder */}
            {imageUri ? (
              <View style={styles.previewWrap}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
                <TouchableOpacity style={styles.retakeBtn} onPress={handleReset}>
                  <Text style={styles.retakeBtnText}>✕ Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.placeholderEmoji}>🖼️</Text>
                <Text style={styles.placeholderText}>No image selected</Text>
              </View>
            )}

            {/* Camera / Library buttons */}
            <View style={styles.pickRow}>
              <TouchableOpacity style={styles.pickBtn} onPress={openCamera} activeOpacity={0.8}>
                <Text style={styles.pickBtnEmoji}>📷</Text>
                <Text style={styles.pickBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickBtn} onPress={openLibrary} activeOpacity={0.8}>
                <Text style={styles.pickBtnEmoji}>🖼️</Text>
                <Text style={styles.pickBtnText}>Photo library</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.generateBtn, (!imageUri || generating) && styles.generateBtnDisabled]}
              onPress={handleGenerate}
              disabled={!imageUri || generating}
              activeOpacity={0.85}
            >
              {generating ? (
                <View style={styles.generatingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.generateBtnText}>  Analysing page…</Text>
                </View>
              ) : (
                <Text style={styles.generateBtnText}>✨ Generate Cards</Text>
              )}
            </TouchableOpacity>

            {generating && (
              <Text style={styles.generatingHint}>
                Vision AI is reading your page. This takes 5–10 seconds.
              </Text>
            )}
          </>
        ) : (
          <>
            <View style={styles.successBanner}>
              <Text style={styles.successEmoji}>🎉</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.successTitle}>{generatedTitle}</Text>
                <Text style={styles.successSub}>{generatedCards.length} cards generated from your photo</Text>
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
              <Text style={styles.studyBtnText}>View & edit deck →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.anotherBtn} onPress={handleReset} activeOpacity={0.8}>
              <Text style={styles.anotherBtnText}>📸 Snap another page</Text>
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

  hero: { alignItems: 'center', marginBottom: 24 },
  heroEmoji: { fontSize: 52, marginBottom: 12 },
  heroTitle: { fontSize: 24, fontWeight: '900', color: '#111827', marginBottom: 8 },
  heroSub: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },

  previewWrap: { alignItems: 'center', marginBottom: 16 },
  previewImage: { width: '100%', height: 280, borderRadius: 16, marginBottom: 10 },
  retakeBtn: {
    backgroundColor: '#fef2f2', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8,
  },
  retakeBtnText: { color: '#dc2626', fontWeight: '600', fontSize: 13 },

  imagePlaceholder: {
    height: 160, borderRadius: 16, borderWidth: 2, borderColor: '#e5e7eb',
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, backgroundColor: '#fff',
  },
  placeholderEmoji: { fontSize: 36, marginBottom: 8 },
  placeholderText: { color: '#9ca3af', fontSize: 14 },

  pickRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  pickBtn: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, borderWidth: 2,
    borderColor: '#e5e7eb', padding: 16, alignItems: 'center', gap: 6,
  },
  pickBtnEmoji: { fontSize: 26 },
  pickBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },

  generateBtn: {
    backgroundColor: '#6366f1', borderRadius: 16, paddingVertical: 17,
    alignItems: 'center',
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

  cardRow: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb',
  },
  cardFront: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardBack: { fontSize: 13, color: '#6b7280' },
  moreCards: { fontSize: 13, color: '#9ca3af', textAlign: 'center', marginBottom: 16 },

  studyBtn: {
    backgroundColor: '#6366f1', borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', marginBottom: 12,
  },
  studyBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  anotherBtn: {
    backgroundColor: '#eef2ff', borderRadius: 16, paddingVertical: 14, alignItems: 'center',
  },
  anotherBtnText: { color: '#4338ca', fontWeight: '700', fontSize: 15 },
});
