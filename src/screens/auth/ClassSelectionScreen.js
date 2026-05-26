// Placeholder for W4. The real ClassSearchScreen lives at
// src/screens/ClassSearchScreen.js. This stub lets the W1 onboarding flow
// complete by marking onboarding done and dropping into the main app.

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StorageService } from '../../services/StorageService';

export default function ClassSelectionScreen({ navigation }) {
  useEffect(() => {
    // Hand off to the real class search screen if it has been built (W4).
    // Otherwise show the placeholder.
  }, []);

  const handleSkipForNow = async () => {
    await StorageService.setOnboardingCompleted(true);
    // Auth gate will swap into MainTabs.
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Your classes</Text>
        <Text style={styles.body}>
          Class search is coming in week 4 of the sprint. For now you can skip
          this step and start with the preset decks.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={handleSkipForNow}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 12 },
  body: { fontSize: 16, color: '#6b7280', lineHeight: 24, marginBottom: 32 },
  button: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
