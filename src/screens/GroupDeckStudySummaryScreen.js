import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GroupDeckStudySummaryScreen({ route, navigation }) {
  const { deckTitle, results = [], totalCards } = route.params;

  const knew = results.filter((r) => r.knew).length;
  const didntKnow = results.length - knew;
  const pct = results.length > 0 ? Math.round((knew / results.length) * 100) : 0;

  let grade, gradeColor, gradeMsg;
  if (pct >= 80) { grade = '🏆'; gradeColor = '#166534'; gradeMsg = 'Excellent!'; }
  else if (pct >= 60) { grade = '👍'; gradeColor = '#92400e'; gradeMsg = 'Good job!'; }
  else { grade = '💪'; gradeColor = '#991b1b'; gradeMsg = 'Keep practicing!'; }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <Text style={styles.gradeEmoji}>{grade}</Text>
        <Text style={[styles.gradeMsg, { color: gradeColor }]}>{gradeMsg}</Text>
        <Text style={styles.deckTitle}>{deckTitle}</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: '#f0fdf4' }]}>
            <Text style={styles.statNum}>{knew}</Text>
            <Text style={styles.statLabel}>Knew it ✓</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#fff7ed' }]}>
            <Text style={styles.statNum}>{pct}%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#fef2f2' }]}>
            <Text style={styles.statNum}>{didntKnow}</Text>
            <Text style={styles.statLabel}>Didn't know ✗</Text>
          </View>
        </View>

        <Text style={styles.sameBoatNote}>
          Your attempts were recorded — classmates studying this deck will now see
          class-level accuracy on each card.
        </Text>

        {/* Actions */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.popToTop()}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Back to group</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => {
            navigation.replace('GroupDeckStudy', route.params);
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryBtnText}>Study again</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { alignItems: 'center', padding: 28, paddingTop: 48 },

  gradeEmoji: { fontSize: 56, marginBottom: 8 },
  gradeMsg: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  deckTitle: { fontSize: 14, color: '#9ca3af', marginBottom: 32, textAlign: 'center' },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
    width: '100%',
  },
  statBox: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statNum: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600', textAlign: 'center' },

  sameBoatNote: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 36,
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    padding: 14,
  },

  primaryBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  secondaryBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  secondaryBtnText: { color: '#6366f1', fontWeight: '600', fontSize: 15 },
});
