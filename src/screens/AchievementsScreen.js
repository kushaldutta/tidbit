/**
 * Achievements — everything you have earned, and what is still out there.
 *
 * Earned state comes from `user_achievements`; display metadata comes from
 * src/config/achievementCatalog.js so locked rows render without a round trip.
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { AchievementService } from '../services/AchievementService';
import { ACHIEVEMENTS } from '../config/achievementCatalog';
import Icon from '../components/Icon';
import { spacing, radius, iconSize } from '../theme/tokens';

function earnedLabel(iso) {
  if (!iso) return 'Earned';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Earned';
  return `Earned ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

export default function AchievementsScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [earned, setEarned] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      // Force the milestone check so a qualifying user sees Century on open.
      AchievementService.syncMilestones({ force: true }).catch(() => {});
      const mine = await AchievementService.getMine();
      setEarned(new Map(mine.map((a) => [a.slug, a])));
    } catch (err) {
      console.warn('[Achievements]', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const earnedCount = ACHIEVEMENTS.filter((a) => earned.has(a.slug)).length;
  const coinsEarned = ACHIEVEMENTS
    .filter((a) => earned.has(a.slug))
    .reduce((sum, a) => sum + a.coins, 0);

  const rows = [
    ...ACHIEVEMENTS.filter((a) => earned.has(a.slug)),
    ...ACHIEVEMENTS.filter((a) => !earned.has(a.slug)),
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Achievements</Text>
        <View style={{ width: 56 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={theme.primary} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={theme.primary}
            />
          }
        >
          <View style={styles.hero}>
            <Icon name="trophy" size={iconSize.hero} color={theme.primary} style={styles.heroIcon} />
            <Text style={styles.heroAmount}>
              {earnedCount}
              <Text style={styles.heroOf}> / {ACHIEVEMENTS.length}</Text>
            </Text>
            <Text style={styles.heroLabel}>Unlocked</Text>
            {coinsEarned > 0 && (
              <Text style={styles.heroSub}>
                Worth {coinsEarned} Study Coins so far.
              </Text>
            )}
          </View>

          {rows.map((a) => {
            const got = earned.get(a.slug);
            return (
              <View key={a.slug} style={[styles.row, !got && styles.rowLocked]}>
                <View style={[styles.iconWrap, got ? styles.iconWrapEarned : styles.iconWrapLocked]}>
                  <Icon
                    name={got ? a.icon : 'lock'}
                    size={iconSize.lg}
                    color={got ? theme.primary : theme.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, !got && styles.titleLocked]}>{a.title}</Text>
                  <Text style={styles.description}>{a.description}</Text>
                  <Text style={[styles.meta, got && styles.metaEarned]}>
                    {got ? earnedLabel(got.earnedAt) : `Locked · +${a.coins} coins`}
                  </Text>
                </View>
              </View>
            );
          })}

          <Text style={styles.footnote}>
            Achievements credit Study Coins automatically the moment you earn them.
          </Text>
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.card,
  },
  back: { fontSize: 16, fontWeight: '600', color: theme.primary, width: 56 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: theme.text,
  },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },

  hero: {
    backgroundColor: theme.primaryLight,
    borderRadius: radius.md,
    padding: spacing.xxl,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.primary,
    marginBottom: spacing.xxl,
  },
  heroIcon: { marginBottom: spacing.sm },
  heroAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: theme.primary,
    fontVariant: ['tabular-nums'],
  },
  heroOf: { fontSize: 24, fontWeight: '700', color: theme.textSecondary },
  heroLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.primary,
    letterSpacing: 0.6,
    marginTop: 2,
  },
  heroSub: {
    fontSize: 13,
    color: theme.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 19,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: theme.border,
  },
  rowLocked: { backgroundColor: theme.surfaceAlt },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconWrapEarned: { backgroundColor: theme.primaryLight },
  iconWrapLocked: { backgroundColor: theme.surfaceAlt },

  title: { fontSize: 15, fontWeight: '700', color: theme.text },
  titleLocked: { color: theme.textSecondary },
  description: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
  meta: { fontSize: 12, color: theme.textMuted, marginTop: spacing.xs, fontWeight: '600' },
  metaEarned: { color: theme.success },

  footnote: {
    fontSize: 12,
    color: theme.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 18,
  },
});
