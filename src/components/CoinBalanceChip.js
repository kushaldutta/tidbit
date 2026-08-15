/**
 * Compact balance chip — Home, Games, etc. Opens the wallet.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Text, TouchableOpacity, StyleSheet, DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CoinService } from '../services/CoinService';

export default function CoinBalanceChip({ navigation }) {
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
    >
      <Text style={styles.emoji}>🪙</Text>
      <Text style={styles.amount}>{balance == null ? '—' : balance}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1.5,
    borderColor: '#fcd34d',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  emoji: { fontSize: 14 },
  amount: { fontSize: 15, fontWeight: '800', color: '#92400e', fontVariant: ['tabular-nums'] },
});
