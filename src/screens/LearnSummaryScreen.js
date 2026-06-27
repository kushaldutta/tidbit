import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MODE_CONFIG = {
  quiz:     { emoji: '🧠', label: 'Quiz',        color: '#6366f1' },
  recall:   { emoji: '✏️',  label: 'Recall',      color: '#8b5cf6' },
  match:    { emoji: '🧩', label: 'Match',       color: '#f59e0b' },
  flashcard:{ emoji: '📇', label: 'Flashcards',  color: '#06b6d4' },
};

function ScoreMeter({ correct, total }) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  let emoji, msg, color;
  if (pct === 100) { emoji = '🏆'; msg = 'Perfect score!'; color = '#16a34a'; }
  else if (pct >= 75) { emoji = '🌟'; msg = 'Great job!'; color = '#16a34a'; }
  else if (pct >= 50) { emoji = '💪'; msg = 'Solid effort'; color = '#f59e0b'; }
  else { emoji = '📖'; msg = 'Keep practicing'; color = '#dc2626'; }

  return (
    <View style={styles.meterWrap}>
      <Text style={styles.meterEmoji}>{emoji}</Text>
      <Text style={[styles.meterPct, { color }]}>{pct}%</Text>
      <Text style={styles.meterMsg}>{msg}</Text>
      <Text style={styles.meterSub}>{correct} / {total} correct</Text>
    </View>
  );
}

export default function LearnSummaryScreen({ route, navigation }) {
  const { deckTitle, correct, total, mode, deckId, studyScope } = route.params;
  const cfg = MODE_CONFIG[mode] || MODE_CONFIG.quiz;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.modePill, { backgroundColor: cfg.color + '20' }]}>
            <Text style={styles.modeEmoji}>{cfg.emoji}</Text>
            <Text style={[styles.modeLabel, { color: cfg.color }]}>{cfg.label} Complete</Text>
          </View>
          <Text style={styles.deckTitle} numberOfLines={2}>{deckTitle}</Text>
        </View>

        {/* Score */}
        <ScoreMeter correct={correct} total={total} />

        {/* Same-boat note */}
        <View style={styles.sameBoatNote}>
          <Text style={styles.sameBoatNoteText}>
            📊 Your results contribute to the class Same-Boat stats your classmates will see.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {deckId && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: cfg.color }]}
                onPress={() => navigation.replace(
                  mode === 'quiz' ? 'Quiz' : mode === 'recall' ? 'Recall' : 'Match',
                  { deckId, deckTitle, studyScope }
                )}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionBtnText, { color: cfg.color }]}>
                  {cfg.emoji} Play again
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => navigation.replace('LearnModePicker', { deckId, deckTitle })}
                activeOpacity={0.8}
              >
                <Text style={styles.pickerBtnText}>🎯 Try another mode</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.8}
          >
            <Text style={styles.homeBtnText}>← Back to home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { padding: 24, paddingBottom: 60 },

  header: { alignItems: 'center', marginBottom: 28 },
  modePill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 16,
  },
  modeEmoji: { fontSize: 18 },
  modeLabel: { fontSize: 14, fontWeight: '700' },
  deckTitle: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center' },

  meterWrap: {
    backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
  },
  meterEmoji: { fontSize: 52, marginBottom: 12 },
  meterPct: { fontSize: 52, fontWeight: '900', marginBottom: 4 },
  meterMsg: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 4 },
  meterSub: { fontSize: 15, color: '#9ca3af' },

  sameBoatNote: {
    backgroundColor: '#eef2ff', borderRadius: 14, padding: 14, marginBottom: 28,
  },
  sameBoatNoteText: { fontSize: 13, color: '#4338ca', fontWeight: '500', lineHeight: 20 },

  actions: { gap: 12 },
  actionBtn: {
    backgroundColor: '#fff', borderWidth: 2, borderRadius: 16,
    paddingVertical: 15, alignItems: 'center',
  },
  actionBtnText: { fontSize: 16, fontWeight: '700' },
  pickerBtn: {
    backgroundColor: '#f3f4f6', borderRadius: 16, paddingVertical: 15, alignItems: 'center',
  },
  pickerBtnText: { color: '#374151', fontWeight: '700', fontSize: 16 },
  homeBtn: {
    paddingVertical: 12, alignItems: 'center',
  },
  homeBtnText: { color: '#9ca3af', fontWeight: '600', fontSize: 15 },
});
