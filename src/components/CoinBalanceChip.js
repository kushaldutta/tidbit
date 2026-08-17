/**
 * Compact balance chip — Home, Games, etc. Opens the wallet.
 *
 * Note: this deliberately does NOT follow theme.primary. Currency should read as
 * currency on every theme, so the chip stays gold and pulls its tones from the
 * shared warning/gold ramp rather than the accent colour.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Text, TouchableOpacity, StyleSheet, DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CoinService } from '../services/CoinService';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';
import { spacing, radius, iconSize } from '../theme/tokens';

export default function CoinBalanceChip({ navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [balance, setBalance] = useState(null);

  const load = useCallback(() => {
    CoinService.getBalance().then(setBalance).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('coinsUpdated', (n) => {
      if (typeof n === 'number') setBalance(n);
      else load();
    });
    return () => sub.remove();
  }, [load]);

  return (
    <TouchableOpacity
      style={styles.chip}
      onPress={() => navigation.navigate('CoinWallet')}
      activeOpacity={0.85}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      accessibilityRole="button"
      accessibilityLabel={
        balance == null ? 'Study coins, loading' : `${balance} study coins`
      }
    >
      <Icon name="coins" size={iconSize.sm} color={theme.warningText} filled />
      <Text style={styles.amount}>{balance == null ? '—' : balance}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.warningBg,
    borderWidth: 1.5,
    borderColor: theme.warning,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    gap: spacing.xs,
  },
  amount: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.warningText,
    // Keeps the chip from reflowing as the balance ticks up.
    fontVariant: ['tabular-nums'],
  },
});
