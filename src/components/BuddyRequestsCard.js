/**
 * Incoming buddy requests with Accept / Decline.
 * Hidden when empty unless emptyMessage is set.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { BuddyService } from '../services/BuddyService';

function Avatar({ name, size = 40 }) {
  const initials = name
    ? name.trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
  const bg = colors[(initials.charCodeAt(0) || 0) % colors.length];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

export default function BuddyRequestsCard({ emptyMessage = null }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [requests, setRequests] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const pending = await BuddyService.getPendingRequests();
      setRequests(pending || []);
    } catch {
      setRequests([]);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('buddyRequestsUpdated', load);
    return () => sub.remove();
  }, [load]);

  const respond = async (req, accept) => {
    setBusyId(req.id);
    try {
      if (accept) await BuddyService.acceptRequest(req.id);
      else await BuddyService.declineRequest(req.id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch (e) {
      Alert.alert(accept ? 'Couldn’t accept' : 'Couldn’t decline', e.message || 'Try again.');
    } finally {
      setBusyId(null);
    }
  };

  if (!requests.length && !emptyMessage) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {requests.length > 0
          ? `Buddy request${requests.length === 1 ? '' : 's'}`
          : 'Buddy requests'}
      </Text>
      {requests.length === 0 ? (
        <Text style={styles.empty}>{emptyMessage}</Text>
      ) : (
        requests.map((req, i) => (
          <View key={req.id} style={[styles.row, i === 0 && styles.rowFirst]}>
            <Avatar name={req.requesterName} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{req.requesterName}</Text>
              <Text style={styles.sub} numberOfLines={1}>
                {req.classCode ? `${req.classCode} · ` : ''}wants to be study buddies
              </Text>
            </View>
            {busyId === req.id ? (
              <ActivityIndicator color={theme.primary} />
            ) : (
              <>
                <TouchableOpacity style={styles.declineBtn} onPress={() => respond(req, false)}>
                  <Text style={styles.declineText}>No</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => respond(req, true)}>
                  <Text style={styles.acceptText}>Accept</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ))
      )}
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  card: {
    backgroundColor: '#eef2ff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#c7d2fe',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3730a3',
    marginBottom: 10,
  },
  empty: {
    fontSize: 14,
    color: theme.textSecondary,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e7ff',
  },
  rowFirst: { borderTopWidth: 0, paddingTop: 0 },
  name: { fontSize: 15, fontWeight: '700', color: theme.text },
  sub: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  declineBtn: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  declineText: { fontWeight: '700', color: '#4b5563', fontSize: 13 },
  acceptBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  acceptText: { fontWeight: '800', color: '#fff', fontSize: 13 },
});
