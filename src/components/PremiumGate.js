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
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';
import { spacing, radius, elevation, iconSize } from '../theme/tokens';

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
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (isPremium) return children;

  return (
    <View style={styles.lockedWrap}>
      <View style={styles.lockedCard}>
        <Icon name="lock" size={iconSize.hero} color={theme.primary} style={styles.lockIcon} />
        <Text style={styles.lockedTitle}>Premium Feature</Text>
        <Text style={styles.lockedDesc}>
          {feature} is part of Tidbit Premium. Upgrade to unlock AI generation, analytics, custom themes, and more.
        </Text>
        <TouchableOpacity
          style={styles.upgradeBtn}
          onPress={() => navigation?.navigate('Paywall')}
          activeOpacity={0.85}
        >
          <Text style={styles.upgradeBtnText}>Upgrade to Premium</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  lockedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
    backgroundColor: theme.background,
  },
  lockedCard: {
    backgroundColor: theme.card,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: theme.border,
    ...elevation.raised,
  },
  lockIcon: { marginBottom: spacing.md },
  lockedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.text,
    marginBottom: spacing.sm,
  },
  lockedDesc: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  upgradeBtn: {
    backgroundColor: theme.primary,
    borderRadius: radius.card,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxxl,
  },
  upgradeBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
