import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EntitlementService } from '../services/EntitlementService';
import { openLegalUrl, PRIVACY_URL, TERMS_URL } from '../constants/legalUrls';

const ENTITLEMENT_ID = 'Tidbit - Never Cram Again! Premium';

const FEATURES = [
  { emoji: '🤖', title: 'AI Deck Generation', desc: 'Describe a topic and get a full deck instantly' },
  { emoji: '📸', title: 'Snap-a-Page', desc: 'Photo your notes or textbook → instant flashcards' },
  { emoji: '📊', title: 'Analytics', desc: 'Mastery curves, retention forecasting, weekly trends' },
  { emoji: '🎨', title: 'Custom Themes', desc: 'Dark mode, warm, cool, and high-contrast themes' },
  { emoji: '♾️', title: 'Unlimited AI Generations', desc: 'No monthly cap on AI-powered deck creation' },
];

function findPackage(offering, type, identifier) {
  if (!offering) return null;
  if (type === 'monthly' && offering.monthly) return offering.monthly;
  if (type === 'yearly' && offering.annual) return offering.annual;
  const packages = offering.availablePackages ?? [];
  return packages.find(
    (p) => p.packageType === (type === 'monthly' ? 'MONTHLY' : 'ANNUAL')
      || p.identifier === identifier,
  ) ?? null;
}

export default function PaywallScreen({ navigation, route }) {
  const [offering, setOffering] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  const onSuccess = route?.params?.onSuccess;

  useEffect(() => {
    EntitlementService.getOffering().then((o) => {
      setOffering(o);
      setLoading(false);
    });
  }, []);

  const monthlyPackage = useMemo(
    () => findPackage(offering, 'monthly', '$rc_monthly'),
    [offering],
  );
  const yearlyPackage = useMemo(
    () => findPackage(offering, 'yearly', '$rc_annual'),
    [offering],
  );

  useEffect(() => {
    if (monthlyPackage) setSelectedPlan('monthly');
    else if (yearlyPackage) setSelectedPlan('yearly');
  }, [monthlyPackage, yearlyPackage]);

  const selectedPackage = selectedPlan === 'yearly' ? yearlyPackage : monthlyPackage;

  const monthlyPrice = monthlyPackage?.product?.priceString ?? '$2.99';
  const yearlyPrice = yearlyPackage?.product?.priceString ?? null;

  const handlePurchase = async () => {
    if (!selectedPackage) {
      Alert.alert('Not available', 'Purchases are not available right now. Try again later.');
      return;
    }
    setPurchasing(true);
    try {
      const info = await EntitlementService.purchasePackage(selectedPackage);
      const isActive = info.entitlements.active[ENTITLEMENT_ID] !== undefined;
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
      if (err?.userCancelled) return;
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

  const handleManageSubscription = async () => {
    const opened = await EntitlementService.showManageSubscriptions();
    if (!opened && Platform.OS === 'ios') {
      Alert.alert(
        'Manage subscription',
        'Open Settings → Apple ID → Subscriptions to change or cancel your Tidbit Premium plan.',
      );
    }
  };

  const renderPlanOption = (plan, label, price, period, badge) => {
    const available = plan === 'monthly' ? monthlyPackage : yearlyPackage;
    if (!available && !loading) return null;

    const isSelected = selectedPlan === plan;
    const displayPrice = price ?? (plan === 'monthly' ? '$2.99' : '—');

    return (
      <TouchableOpacity
        key={plan}
        style={[styles.planCard, isSelected && styles.planCardSelected]}
        onPress={() => setSelectedPlan(plan)}
        activeOpacity={0.85}
        disabled={!available}
      >
        <View style={styles.planHeader}>
          <View style={[styles.planRadio, isSelected && styles.planRadioSelected]}>
            {isSelected ? <View style={styles.planRadioDot} /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.planTitleRow}>
              <Text style={styles.planLabel}>{label}</Text>
              {badge ? (
                <View style={styles.planBadge}>
                  <Text style={styles.planBadgeText}>{badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.planPeriod}>{period}</Text>
          </View>
          <Text style={styles.planPrice}>{displayPrice}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>✨</Text>
          <Text style={styles.heroTitle}>Tidbit Premium</Text>
          <Text style={styles.heroSub}>
            The full study toolkit — AI-powered, beautifully designed, built for serious students.
          </Text>
        </View>

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

        <View style={styles.ctaWrap}>
          {loading ? (
            <ActivityIndicator color="#6366f1" style={{ marginVertical: 24 }} />
          ) : (
            <>
              <Text style={styles.plansHeading}>Choose a plan</Text>
              <View style={styles.plansList}>
                {renderPlanOption('monthly', 'Monthly', monthlyPrice, 'Billed every month')}
                {renderPlanOption('yearly', 'Yearly', yearlyPrice, 'Billed once a year', 'Best value')}
              </View>
              <Text style={styles.priceNote}>Cancel anytime. No commitment.</Text>

              <TouchableOpacity
                style={[styles.subscribeBtn, (purchasing || !selectedPackage) && styles.subscribeBtnDisabled]}
                onPress={handlePurchase}
                disabled={purchasing || !selectedPackage}
                activeOpacity={0.85}
              >
                {purchasing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.subscribeBtnText}>
                    Start Premium {selectedPlan === 'yearly' ? '(Yearly)' : '(Monthly)'} →
                  </Text>
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

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.manageBtn}
              onPress={handleManageSubscription}
              activeOpacity={0.7}
            >
              <Text style={styles.manageText}>Manage subscription</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.legal}>
            Payment will be charged to your Apple ID at confirmation of purchase. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period.
          </Text>

          <View style={styles.legalLinks}>
            <TouchableOpacity onPress={() => openLegalUrl(PRIVACY_URL, 'Privacy Policy')}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.legalDot}>·</Text>
            <TouchableOpacity onPress={() => openLegalUrl(TERMS_URL, 'Terms of Service')}>
              <Text style={styles.legalLink}>Terms of Service (EULA)</Text>
            </TouchableOpacity>
          </View>
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
  plansHeading: {
    alignSelf: 'stretch', fontSize: 14, fontWeight: '700',
    color: '#a5b4fc', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  plansList: { alignSelf: 'stretch', gap: 12, marginBottom: 16 },
  planCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardSelected: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99,102,241,0.15)',
  },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planRadio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#6b7280',
    alignItems: 'center', justifyContent: 'center',
  },
  planRadioSelected: { borderColor: '#6366f1' },
  planRadioDot: {
    width: 12, height: 12, borderRadius: 6, backgroundColor: '#6366f1',
  },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  planLabel: { fontSize: 16, fontWeight: '800', color: '#fff' },
  planBadge: {
    backgroundColor: '#6366f1', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  planBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff', textTransform: 'uppercase' },
  planPeriod: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  planPrice: { fontSize: 18, fontWeight: '800', color: '#fff' },
  priceNote: { fontSize: 13, color: '#6b7280', marginBottom: 24 },

  subscribeBtn: {
    backgroundColor: '#6366f1', borderRadius: 18,
    paddingVertical: 18, paddingHorizontal: 24,
    width: '100%', alignItems: 'center', marginBottom: 16,
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 8,
  },
  subscribeBtnDisabled: { opacity: 0.6 },
  subscribeBtnText: { color: '#fff', fontWeight: '800', fontSize: 17 },

  restoreBtn: { paddingVertical: 12, marginBottom: 4 },
  restoreText: { color: '#6b7280', fontSize: 14, fontWeight: '500' },

  manageBtn: { paddingVertical: 8, marginBottom: 16 },
  manageText: { color: '#6b7280', fontSize: 14, fontWeight: '500' },

  legal: {
    fontSize: 11, color: '#4b5563', textAlign: 'center', lineHeight: 16,
    marginBottom: 12,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  legalLink: {
    fontSize: 12,
    color: '#a5b4fc',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  legalDot: { fontSize: 12, color: '#4b5563' },
});
