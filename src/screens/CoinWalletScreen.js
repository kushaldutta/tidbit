/**
 * Study Coins wallet — balance, shop, recent earnings.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { CoinService } from '../services/CoinService';
import { SHOP_ITEMS, SHOP_ITEM, COMING_SOON_ITEMS } from '../config/coinShop';

function sourceLabel(type) {
  const map = {
    daily_challenge_participation: 'Daily Challenge',
    daily_challenge_rank: 'Challenge rank',
    speed_duel: 'Speed Duel',
    runner: 'Infinite Runner',
    achievement: 'Achievement',
    jeopardy: 'Jeopardy',
    wordle: 'Daily Term',
    shop: 'Shop',
  };
  return map[type] || type.replace(/_/g, ' ');
}

function relativeTime(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return 'yesterday';
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function CoinWalletScreen({ navigation }) {
  const { theme, setThemeId } = useTheme();
  const styles = makeStyles(theme);
  const [balance, setBalance] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [unlockedIds, setUnlockedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buying, setBuying] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [b, rows, ids] = await Promise.all([
        CoinService.getBalance({ bypassCache: true }),
        CoinService.getRecentLedger(15),
        CoinService.getUnlockedItemIds(),
      ]);
      setBalance(b);
      setLedger(rows);
      setUnlockedIds(ids);
    } catch (e) {
      console.warn('[CoinWallet]', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const sunset = SHOP_ITEMS[SHOP_ITEM.THEME_SUNSET];
  const ownsSunset = unlockedIds.includes(SHOP_ITEM.THEME_SUNSET);

  const buySunset = () => {
    if (ownsSunset) {
      navigation.navigate('ThemePicker');
      return;
    }
    const coins = balance ?? 0;
    if (coins < sunset.cost) {
      Alert.alert(
        'Not enough coins',
        `Sunset costs ${sunset.cost}. You have ${coins}.`,
      );
      return;
    }
    Alert.alert(
      'Unlock Sunset?',
      `${sunset.cost} Study Coins. You have ${coins}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Spend ${sunset.cost}`,
          onPress: async () => {
            setBuying(true);
            try {
              const result = await CoinService.purchase(SHOP_ITEM.THEME_SUNSET);
              if (result.ok || result.reason === 'already_owned') {
                await load();
                await setThemeId('sunset');
              } else if (result.reason === 'insufficient_funds') {
                Alert.alert('Not enough coins', 'Earn more, then try again.');
              } else {
                Alert.alert('Couldn’t unlock', 'Try again in a moment.');
              }
            } finally {
              setBuying(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Study Coins</Text>
        <View style={{ width: 56 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color="#d97706" />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#d97706" />}
        >
          <View style={styles.hero}>
            <Text style={styles.heroEmoji}>🪙</Text>
            <Text style={styles.heroAmount}>{balance ?? 0}</Text>
            <Text style={styles.heroLabel}>Study Coins</Text>
            <Text style={styles.heroSub}>
              Earn from challenges, duels, and runs. Spend on cosmetics — never on study advantages.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Shop</Text>
          <Text style={styles.sectionSub}>Sunset is live. More cosmetics later.</Text>
          <TouchableOpacity
            style={styles.soonRow}
            onPress={buySunset}
            activeOpacity={0.85}
            disabled={buying}
          >
            <Text style={styles.soonEmoji}>{sunset.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.soonTitle}>{sunset.title}</Text>
              <Text style={styles.soonBlurb}>{sunset.blurb}</Text>
            </View>
            <View style={[styles.costPill, ownsSunset ? styles.costPillOwned : (balance ?? 0) >= sunset.cost && styles.costPillReady]}>
              <Text style={[styles.costText, ownsSunset ? styles.costTextOwned : (balance ?? 0) >= sunset.cost && styles.costTextReady]}>
                {ownsSunset ? 'Owned' : sunset.cost}
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Coming soon</Text>
          <Text style={styles.sectionSub}>Keep stacking. These unlock when the shop grows.</Text>
          {COMING_SOON_ITEMS.map((item) => {
            const canAfford = (balance ?? 0) >= item.cost;
            return (
              <View key={item.title} style={styles.soonRow}>
                <Text style={styles.soonEmoji}>{item.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.soonTitle}>{item.title}</Text>
                  <Text style={styles.soonBlurb}>{item.blurb}</Text>
                </View>
                <View style={[styles.costPill, canAfford && styles.costPillReady]}>
                  <Text style={[styles.costText, canAfford && styles.costTextReady]}>
                    {item.cost}
                  </Text>
                </View>
              </View>
            );
          })}

          <Text style={[styles.sectionTitle, { marginTop: 22 }]}>Recent</Text>
          {ledger.length === 0 ? (
            <Text style={styles.empty}>Play a Daily Challenge or Speed Duel to start earning.</Text>
          ) : (
            ledger.map((row, i) => (
              <View key={`${row.created_at}-${i}`} style={styles.ledgerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ledgerNote}>{row.note || sourceLabel(row.source_type)}</Text>
                  <Text style={styles.ledgerMeta}>
                    {sourceLabel(row.source_type)} · {relativeTime(row.created_at)}
                  </Text>
                </View>
                <Text style={[styles.ledgerAmt, row.amount < 0 && styles.ledgerAmtSpend]}>
                  {row.amount > 0 ? `+${row.amount}` : row.amount}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.primaryLight,
    backgroundColor: theme.card,
  },
  back: { fontSize: 16, fontWeight: '600', color: theme.primary, width: 56 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: theme.text },
  scroll: { padding: 16, paddingBottom: 40 },
  hero: {
    backgroundColor: '#fffbeb',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fcd34d',
    marginBottom: 22,
  },
  heroEmoji: { fontSize: 40, marginBottom: 6 },
  heroAmount: { fontSize: 48, fontWeight: '900', color: '#92400e', fontVariant: ['tabular-nums'] },
  heroLabel: { fontSize: 14, fontWeight: '800', color: '#b45309', letterSpacing: 0.6, marginTop: 2 },
  heroSub: {
    fontSize: 13,
    color: '#92400e',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 19,
    opacity: 0.85,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: theme.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionSub: { fontSize: 13, color: theme.textSecondary, marginBottom: 12 },
  soonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  soonEmoji: { fontSize: 24 },
  soonTitle: { fontSize: 15, fontWeight: '700', color: theme.text },
  soonBlurb: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  costPill: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 44,
    alignItems: 'center',
  },
  costPillReady: { backgroundColor: '#fef3c7' },
  costPillOwned: { backgroundColor: '#dcfce7' },
  costText: { fontWeight: '800', color: '#6b7280' },
  costTextReady: { color: '#92400e' },
  costTextOwned: { color: '#166534' },
  empty: { fontSize: 14, color: theme.textSecondary, marginTop: 8 },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.primaryLight,
  },
  ledgerNote: { fontSize: 15, fontWeight: '600', color: theme.text },
  ledgerMeta: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  ledgerAmt: { fontSize: 16, fontWeight: '800', color: '#b45309' },
  ledgerAmtSpend: { color: '#6b7280' },
});
