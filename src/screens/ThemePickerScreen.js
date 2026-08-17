import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, THEMES } from '../context/ThemeContext';
import { usePremium } from '../components/PremiumGate';
import { CoinService } from '../services/CoinService';
import {
  SHOP_ITEM,
  shopItemForTheme,
  isThemeUnlocked,
} from '../config/coinShop';

export default function ThemePickerScreen({ navigation }) {
  const { theme, setThemeId, themeId } = useTheme();
  const { isPremium, loading: premiumLoading } = usePremium(navigation);
  const [unlockedIds, setUnlockedIds] = useState([]);
  const [balance, setBalance] = useState(0);
  const [buying, setBuying] = useState(false);

  const loadUnlocks = useCallback(async () => {
    const [ids, coins] = await Promise.all([
      CoinService.getUnlockedItemIds(),
      CoinService.getBalance({ bypassCache: true }),
    ]);
    setUnlockedIds(ids);
    setBalance(coins ?? 0);
  }, []);

  useFocusEffect(useCallback(() => { loadUnlocks(); }, [loadUnlocks]));

  useEffect(() => {
    const a = DeviceEventEmitter.addListener('cosmeticsUpdated', loadUnlocks);
    const b = DeviceEventEmitter.addListener('coinsUpdated', (n) => {
      if (typeof n === 'number') setBalance(n);
      else loadUnlocks();
    });
    return () => { a.remove(); b.remove(); };
  }, [loadUnlocks]);

  const unlocked = (id) => isThemeUnlocked(id, { isPremium, unlockedItemIds: unlockedIds });

  const buySunset = async () => {
    const item = shopItemForTheme('sunset');
    if (!item) return;
    if (balance < item.cost) {
      Alert.alert(
        'Not enough coins',
        `Sunset costs ${item.cost} Study Coins. You have ${balance}. Earn more from Daily Challenge, Speed Duel, or Infinite Runner.`,
      );
      return;
    }
    Alert.alert(
      'Unlock Sunset?',
      `${item.cost} Study Coins. You have ${balance}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Spend ${item.cost}`,
          onPress: async () => {
            setBuying(true);
            try {
              const result = await CoinService.purchase(SHOP_ITEM.THEME_SUNSET);
              if (result.ok || result.reason === 'already_owned') {
                await loadUnlocks();
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

  const onPressTheme = (t) => {
    if (unlocked(t.id)) {
      setThemeId(t.id);
      return;
    }
    if (t.id === 'sunset') {
      buySunset();
      return;
    }
    Alert.alert(
      'Premium theme',
      `${t.label} is included with Tidbit Premium. Sunset can be unlocked with Study Coins.`,
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Upgrade', onPress: () => navigation.navigate('Paywall') },
      ],
    );
  };

  if (premiumLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator style={{ flex: 1 }} color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.topBar, { borderBottomColor: theme.primaryLight }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backText, { color: theme.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>App Theme</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          Classic is free. Sunset unlocks with Study Coins. Midnight, Forest, and Ocean are Premium.
        </Text>

        {Object.values(THEMES).map((t) => {
          const active = t.id === themeId;
          const open = unlocked(t.id);
          const coinItem = shopItemForTheme(t.id);
          return (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.themeCard,
                { backgroundColor: theme.card, borderColor: active ? theme.primary : theme.primaryLight },
                active && styles.themeCardActive,
                !open && styles.themeCardLocked,
              ]}
              onPress={() => onPressTheme(t)}
              activeOpacity={0.8}
              disabled={buying}
            >
              <View style={[styles.swatch, { backgroundColor: t.primary }]} />
              <View style={[styles.swatchSmall, { backgroundColor: t.accent, marginLeft: 8 }]} />
              <Text style={[styles.themeName, { color: theme.text }]}>
                {t.emoji}  {t.label}
              </Text>
              {active ? (
                <View style={[styles.checkBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
              ) : open ? null : coinItem ? (
                <View style={styles.coinPill}>
                  <Text style={styles.coinPillText}>🪙 {coinItem.cost}</Text>
                </View>
              ) : (
                <View style={styles.lockPill}>
                  <Text style={styles.lockPillText}>🔒 Premium</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Preview</Text>
        <View style={[styles.previewCard, { backgroundColor: theme.card, borderColor: theme.primaryLight }]}>
          <View style={[styles.previewHeader, { backgroundColor: theme.primary }]}>
            <Text style={styles.previewHeaderText}>Tidbit</Text>
          </View>
          <View style={styles.previewBody}>
            <Text style={[styles.previewTitle, { color: theme.text }]}>Mitosis vs Meiosis</Text>
            <Text style={[styles.previewSub, { color: theme.textSecondary }]}>
              Mitosis produces two genetically identical daughter cells; meiosis produces four genetically diverse gametes.
            </Text>
            <View style={[styles.previewBtn, { backgroundColor: theme.primary }]}>
              <Text style={styles.previewBtnText}>Knew it ✓</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.primary }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  backText: { fontSize: 15, fontWeight: '600', width: 60 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  scroll: { padding: 20, paddingBottom: 60 },
  hint: { fontSize: 13, marginBottom: 20, lineHeight: 20 },

  themeCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16,
    marginBottom: 10, borderWidth: 2,
  },
  themeCardActive: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  themeCardLocked: { opacity: 0.72 },
  swatch: { width: 28, height: 28, borderRadius: 14 },
  swatchSmall: { width: 16, height: 16, borderRadius: 8, marginRight: 12 },
  themeName: { flex: 1, fontSize: 16, fontWeight: '700' },
  checkBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  checkText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  coinPill: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  coinPillText: { fontSize: 13, fontWeight: '800', color: '#92400e' },
  lockPill: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  lockPillText: { fontSize: 12, fontWeight: '800', color: '#6b7280' },

  sectionLabel: {
    fontSize: 11, fontWeight: '800', textTransform: 'uppercase',
    letterSpacing: 1, marginTop: 24, marginBottom: 12,
  },
  previewCard: {
    borderRadius: 20, overflow: 'hidden', borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  previewHeader: { paddingHorizontal: 20, paddingVertical: 14 },
  previewHeaderText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  previewBody: { padding: 20 },
  previewTitle: { fontSize: 17, fontWeight: '800', marginBottom: 8 },
  previewSub: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  previewBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  previewBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  saveBtn: {
    borderRadius: 16, paddingVertical: 17,
    alignItems: 'center', marginTop: 24, marginBottom: 8,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
