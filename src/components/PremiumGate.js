/**
 * PremiumGate
 *
 * Wrap any Premium-only feature with this component.
 * If the user has Premium → renders children normally.
 * If not            → renders a locked card with an "Upgrade" button.
 *
 * Usage:
 *   <PremiumGate navigation={navigation} feature="AI Deck Generation">
 *     <AIDeckScreen />
 *   </PremiumGate>
 *
 * Or as a hook-style check:
 *   const { isPremium, loading } = usePremium();
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { EntitlementService } from '../services/EntitlementService';

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePremium(navigation) {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  const check = () => {
    EntitlementService.isPremium().then((v) => {
      setIsPremium(v);
      setLoading(false);
    });
  };

  useEffect(() => {
    check();

    // Re-check whenever this screen comes back into focus (e.g. after closing Paywall)
    const unsub = navigation?.addListener?.('focus', check);

    // Also subscribe to real-time RevenueCat updates
    const unsubRC = EntitlementService.subscribe((v) => {
      setIsPremium(v);
      setLoading(false);
    });

    return () => {
      unsub?.();
      unsubRC();
    };
  }, [navigation]);

  return { isPremium, loading, recheck: check };
}

// ─── Gate component ───────────────────────────────────────────────────────────

export default function PremiumGate({ children, navigation, feature = 'This feature' }) {
  const { isPremium, loading } = usePremium(navigation);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#6366f1" />
      </View>
    );
  }

  if (isPremium) return children;

  return (
    <View style={styles.lockedWrap}>
      <View style={styles.lockedCard}>
        <Text style={styles.lockEmoji}>🔒</Text>
        <Text style={styles.lockedTitle}>Premium Feature</Text>
        <Text style={styles.lockedDesc}>
          {feature} is part of Tidbit Premium. Upgrade to unlock AI generation, analytics, custom themes, and more.
        </Text>
        <TouchableOpacity
          style={styles.upgradeBtn}
          onPress={() => navigation?.navigate('Paywall')}
          activeOpacity={0.85}
        >
          <Text style={styles.upgradeBtnText}>✨ Upgrade to Premium</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  lockedWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, backgroundColor: '#f9fafb',
  },
  lockedCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 28,
    alignItems: 'center', width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 6,
  },
  lockEmoji: { fontSize: 48, marginBottom: 12 },
  lockedTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8 },
  lockedDesc: {
    fontSize: 14, color: '#6b7280', textAlign: 'center',
    lineHeight: 22, marginBottom: 24,
  },
  upgradeBtn: {
    backgroundColor: '#6366f1', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 32,
  },
  upgradeBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
