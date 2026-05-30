import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EntitlementService } from '../services/EntitlementService';

const FEATURES = [
  { emoji: '🤖', title: 'AI Deck Generation', desc: 'Describe a topic and get a full deck instantly' },
  { emoji: '📸', title: 'Snap-a-Page', desc: 'Photo your notes or textbook → instant flashcards' },
  { emoji: '📊', title: 'Advanced Analytics', desc: 'Mastery curves, retention forecasting, weekly trends' },
  { emoji: '🎨', title: 'Custom Themes', desc: 'Dark mode, warm, cool, and high-contrast themes' },
  { emoji: '♾️', title: 'Unlimited AI Generations', desc: 'No monthly cap on AI-powered deck creation' },
];

export default function PaywallScreen({ navigation, route }) {
  const [offering, setOffering] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Optional: called after successful purchase
  const onSuccess = route?.params?.onSuccess;

  useEffect(() => {
    EntitlementService.getOffering().then((o) => {
      setOffering(o);
      setLoading(false);
    });
  }, []);

  const monthlyPackage = offering?.monthly ?? offering?.availablePackages?.[0] ?? null;
  const priceString = monthlyPackage?.product?.priceString ?? '$2.99';

  const handlePurchase = async () => {
    if (!monthlyPackage) {
      Alert.alert('Not available', 'Purchases are not available right now. Try again later.');
      return;
    }
    setPurchasing(true);
    try {
      const info = await EntitlementService.purchasePackage(monthlyPackage);
      const isActive = info.entitlements.active['Tidbit - Never Cram Again! Premium'] !== undefined;
      if (isActive) {
        Alert.alert('Welcome to Premium! 🎉', 'Your subscription is now active.', [
          {
            text: 'Let\'s go',
            onPress: () => {
              if (onSuccess) onSuccess();
              navigation.goBack();
            },
          },
        ]);
      }
    } catch (err) {
      if (err?.userCancelled) return; // user dismissed sheet — don't show error
      Alert.alert('Purchase failed', err.message || 'Something went wrong. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const restored = await EntitlementService.restorePurchases();
      if (restored) {
        Alert.alert('Restored! 🎉', 'Your Premium subscription has been restored.', [
          { text: 'Done', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Nothing to restore', 'No active Premium subscription found for this Apple ID.');
      }
    } catch (err) {
      Alert.alert('Restore failed', err.message || 'Something went wrong.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>✨</Text>
          <Text style={styles.heroTitle}>Tidbit Premium</Text>
          <Text style={styles.heroSub}>
            The full study toolkit — AI-powered, beautifully designed, built for serious students.
          </Text>
        </View>

        {/* Feature list */}
        <View style={styles.featureList}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureRow}>
              <Text style={styles.featureEmoji}>{f.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Price + CTA */}
        <View style={styles.ctaWrap}>
          {loading ? (
            <ActivityIndicator color="#6366f1" style={{ marginVertical: 24 }} />
          ) : (
            <>
              <View style={styles.priceRow}>
                <Text style={styles.price}>{priceString}</Text>
                <Text style={styles.pricePer}> / month</Text>
              </View>
              <Text style={styles.priceNote}>Cancel anytime. No commitment.</Text>

              <TouchableOpacity
                style={[styles.subscribeBtn, purchasing && styles.subscribeBtnDisabled]}
                onPress={handlePurchase}
                disabled={purchasing}
                activeOpacity={0.85}
              >
                {purchasing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.subscribeBtnText}>Start Premium →</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.restoreBtn}
            onPress={handleRestore}
            disabled={restoring}
            activeOpacity={0.7}
          >
            {restoring ? (
              <ActivityIndicator color="#9ca3af" size="small" />
            ) : (
              <Text style={styles.restoreText}>Restore purchases</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.legal}>
            Payment will be charged to your Apple ID. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0a2e' },

  header: {
    flexDirection: 'row', justifyContent: 'flex-end',
    paddingHorizontal: 20, paddingTop: 8,
  },
  closeBtn: { padding: 8 },
  closeText: { color: '#9ca3af', fontSize: 18, fontWeight: '600' },

  scroll: { padding: 24, paddingBottom: 48 },

  hero: { alignItems: 'center', marginBottom: 36 },
  heroEmoji: { fontSize: 56, marginBottom: 12 },
  heroTitle: { fontSize: 32, fontWeight: '900', color: '#fff', marginBottom: 10 },
  heroSub: {
    fontSize: 16, color: '#a5b4fc', textAlign: 'center', lineHeight: 24,
  },

  featureList: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20,
    padding: 20, gap: 18, marginBottom: 32,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureEmoji: { fontSize: 26, width: 36, textAlign: 'center' },
  featureTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 2 },
  featureDesc: { fontSize: 13, color: '#a5b4fc', lineHeight: 18 },

  ctaWrap: { alignItems: 'center' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
  price: { fontSize: 40, fontWeight: '900', color: '#fff' },
  pricePer: { fontSize: 18, color: '#a5b4fc', fontWeight: '500' },
  priceNote: { fontSize: 13, color: '#6b7280', marginBottom: 24 },

  subscribeBtn: {
    backgroundColor: '#6366f1', borderRadius: 18,
    paddingVertical: 18, paddingHorizontal: 48,
    width: '100%', alignItems: 'center', marginBottom: 16,
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 8,
  },
  subscribeBtnDisabled: { opacity: 0.6 },
  subscribeBtnText: { color: '#fff', fontWeight: '800', fontSize: 18 },

  restoreBtn: { paddingVertical: 12, marginBottom: 20 },
  restoreText: { color: '#6b7280', fontSize: 14, fontWeight: '500' },

  legal: {
    fontSize: 11, color: '#4b5563', textAlign: 'center', lineHeight: 16,
  },
});
