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
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/Icon';
import { spacing, radius, elevation, iconSize } from '../theme/tokens';

const ENTITLEMENT_ID = 'Tidbit - Never Cram Again! Premium';

const FEATURES = [
  { icon: 'ai', title: 'AI Deck Generation', desc: 'Describe a topic and get a full deck instantly' },
  { icon: 'snap', title: 'Snap-a-Page', desc: 'Photo your notes or textbook → instant flashcards' },
  { icon: 'stats', title: 'Analytics', desc: 'Mastery curves, retention forecasting, weekly trends' },
  { icon: 'palette', title: 'Custom Themes', desc: 'Dark mode, warm, cool, and high-contrast themes' },
  { icon: 'add', title: 'Unlimited AI Generations', desc: 'No monthly cap on AI-powered deck creation' },
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
  const { theme } = useTheme();
  const styles = makeStyles(theme);

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
        Alert.alert('Welcome to Premium', 'Your subscription is now active.', [
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
        Alert.alert('Restored', 'Your Premium subscription has been restored.', [
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
          <Icon name="close" size={iconSize.md} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Icon name="trophy" size={iconSize.hero} color={theme.primary} style={styles.heroIcon} />
          <Text style={styles.heroTitle}>Tidbit Premium</Text>
          <Text style={styles.heroSub}>
            The full study toolkit — AI-powered, beautifully designed, built for serious students.
          </Text>
        </View>

        <View style={styles.featureList}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureRow}>
              <Icon name={f.icon} size={iconSize.lg} color={theme.primary} style={styles.featureIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.ctaWrap}>
          {loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginVertical: spacing.xxl }} />
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
              <ActivityIndicator color={theme.textMuted} size="small" />
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

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  closeBtn: { padding: spacing.sm },

  scroll: { padding: spacing.xxl, paddingBottom: 48 },

  hero: { alignItems: 'center', marginBottom: spacing.xxxl },
  heroIcon: { marginBottom: spacing.md },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.text,
    marginBottom: spacing.sm,
  },
  heroSub: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },

  featureList: {
    backgroundColor: theme.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: spacing.xl,
    gap: spacing.lg,
    marginBottom: spacing.xxxl,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureIcon: { width: 36, textAlign: 'center' },
  featureTitle: { fontSize: 15, fontWeight: '700', color: theme.text, marginBottom: 2 },
  featureDesc: { fontSize: 13, color: theme.textSecondary, lineHeight: 18 },

  ctaWrap: { alignItems: 'center' },
  plansHeading: {
    alignSelf: 'stretch',
    fontSize: 14,
    fontWeight: '700',
    color: theme.textSecondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  plansList: { alignSelf: 'stretch', gap: spacing.md, marginBottom: spacing.lg },
  planCard: {
    backgroundColor: theme.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: theme.border,
  },
  planCardSelected: {
    borderColor: theme.primary,
    backgroundColor: theme.primaryLight,
  },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRadioSelected: { borderColor: theme.primary },
  planRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.primary,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  planLabel: { fontSize: 16, fontWeight: '700', color: theme.text },
  planBadge: {
    backgroundColor: theme.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  planPeriod: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  planPrice: { fontSize: 18, fontWeight: '700', color: theme.text },
  priceNote: { fontSize: 13, color: theme.textMuted, marginBottom: spacing.xxl },

  subscribeBtn: {
    backgroundColor: theme.primary,
    borderRadius: radius.lg,
    paddingVertical: 18,
    paddingHorizontal: spacing.xxl,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...elevation.raised,
  },
  subscribeBtnDisabled: { opacity: 0.6 },
  subscribeBtnText: { color: '#fff', fontWeight: '700', fontSize: 17 },

  restoreBtn: { paddingVertical: spacing.md, marginBottom: spacing.xs },
  restoreText: { color: theme.textSecondary, fontSize: 14, fontWeight: '500' },

  manageBtn: { paddingVertical: spacing.sm, marginBottom: spacing.lg },
  manageText: { color: theme.textSecondary, fontSize: 14, fontWeight: '500' },

  legal: {
    fontSize: 11,
    color: theme.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: spacing.md,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  legalLink: {
    fontSize: 12,
    color: theme.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  legalDot: { fontSize: 12, color: theme.textMuted },
});
