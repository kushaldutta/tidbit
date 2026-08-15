import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { GroupService } from '../services/GroupService';
import { BlockService } from '../services/BlockService';
import { BuddyService } from '../services/BuddyService';
import { AuthService } from '../services/AuthService';
import { ClassService } from '../services/ClassService';

function Avatar({ name, size = 44 }) {
  const initials = name
    ? name.trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
  const bg = colors[initials.charCodeAt(0) % colors.length];
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

export default function GroupClassmatesScreen({ route, navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { classId, code, title, duelMode = false } = route.params;
  const myUserId = AuthService.getUserId();

  const [classmates, setClassmates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Map: userId → 'none' | 'request_sent' | 'request_received' | 'buddies'
  const [relationships, setRelationships] = useState({});
  const [incomingByUser, setIncomingByUser] = useState({});
  const [sendingRequest, setSendingRequest] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [cm, blockedIds, pending] = await Promise.all([
        GroupService.getClassmates(classId),
        BlockService.getBlockedUserIds(),
        BuddyService.getPendingRequests(),
      ]);
      const filtered = BlockService.filterClassmates(cm, blockedIds);
      setClassmates(filtered);

      const incoming = {};
      for (const req of pending) {
        if (String(req.classId) === String(classId)) incoming[req.requesterId] = req.id;
      }
      setIncomingByUser(incoming);

      // Load buddy relationship status for each classmate
      const statuses = {};
      await Promise.all(
        filtered.map(async (c) => {
          if (c.id !== myUserId) {
            statuses[c.id] = incoming[c.id]
              ? 'request_received'
              : await BuddyService.getRelationshipStatus(c.id, classId);
          }
        })
      );
      setRelationships(statuses);
    } catch (e) {
      console.warn('[GroupClassmatesScreen] load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [classId, myUserId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleRespond = async (classmate) => {
    let requestId = incomingByUser[classmate.id];
    if (!requestId) {
      const pending = await BuddyService.getPendingRequests();
      requestId = pending.find((r) => r.requesterId === classmate.id && String(r.classId) === String(classId))?.id;
    }
    if (!requestId) {
      Alert.alert('Request not found', 'Pull to refresh and try again.');
      return;
    }
    Alert.alert(
      `Buddy request from ${classmate.display_name || 'Tidbit User'}`,
      'Accept to share a streak and nudge each other in this class.',
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await BuddyService.declineRequest(requestId);
              setRelationships((prev) => ({ ...prev, [classmate.id]: 'none' }));
              setIncomingByUser((prev) => {
                const next = { ...prev };
                delete next[classmate.id];
                return next;
              });
            } catch (e) {
              Alert.alert('Couldn’t decline', e.message || 'Try again.');
            }
          },
        },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await BuddyService.acceptRequest(requestId);
              setRelationships((prev) => ({ ...prev, [classmate.id]: 'buddies' }));
              setIncomingByUser((prev) => {
                const next = { ...prev };
                delete next[classmate.id];
                return next;
              });
            } catch (e) {
              Alert.alert('Couldn’t accept', e.message || 'Try again.');
            }
          },
        },
      ],
    );
  };

  const handleSendRequest = async (classmate) => {
    setSendingRequest(classmate.id);
    try {
      await BuddyService.sendRequest(classmate.id, classId);
      setRelationships((prev) => ({ ...prev, [classmate.id]: 'request_sent' }));
      Alert.alert('Buddy request sent!', `${classmate.display_name || 'Tidbit User'} will see your request.`);
    } catch (e) {
      Alert.alert('Could not send request', e.message || 'Try again.');
    } finally {
      setSendingRequest(null);
    }
  };

  const buddyButtonLabel = (status) => {
    switch (status) {
      case 'buddies': return '🤝 Buddies';
      case 'request_sent': return 'Requested';
      case 'request_received': return 'Respond ›';
      default: return '+ Buddy';
    }
  };

  const buddyButtonDisabled = (status) => status === 'buddies' || status === 'request_sent';

  const renderRow = ({ item }) => {
    const isMe = item.id === myUserId;
    const status = relationships[item.id] || 'none';
    const isSending = sendingRequest === item.id;

    return (
      <View style={styles.row}>
        <Avatar name={item.display_name} size={48} />
        <View style={styles.rowMeta}>
          <Text style={styles.rowName}>
            {item.display_name || 'Tidbit User'}
            {isMe ? ' (you)' : ''}
          </Text>
          {item.grad_year ? (
            <Text style={styles.rowYear}>Class of {item.grad_year}</Text>
          ) : null}
        </View>
        {!isMe && (
          <View style={styles.rowActions}>
            {(duelMode || ClassService.hasTidbitContent(classId)) && (
              <TouchableOpacity
                style={styles.duelBtn}
                onPress={() => navigation.navigate('SpeedDuel', {
                  classId,
                  opponentId: item.id,
                  opponentName: item.display_name || 'Classmate',
                })}
              >
                <Text style={styles.duelBtnText}>⚔️ Duel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.buddyBtn,
                status === 'buddies' && styles.buddyBtnActive,
                buddyButtonDisabled(status) && styles.buddyBtnDisabled,
              ]}
              onPress={() => {
                if (status === 'none') handleSendRequest(item);
                else if (status === 'request_received') handleRespond(item);
              }}
              disabled={buddyButtonDisabled(status) || isSending}
            >
              {isSending
                ? <ActivityIndicator size="small" color={status === 'buddies' ? '#fff' : theme.accent} />
                : <Text style={[styles.buddyBtnText, status === 'buddies' && styles.buddyBtnTextActive]}>
                    {buddyButtonLabel(status)}
                  </Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerMeta}>
          <Text style={styles.headerTitle}>{duelMode ? 'Speed Duel' : 'Classmates'}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {code}{title ? ` · ${title}` : ''}
          </Text>
        </View>
        <View style={{ width: 56 }} />
      </View>

      <View style={styles.hint}>
        <Text style={styles.hintText}>
          {duelMode
            ? 'Pick a classmate — same 10 cards, definition → term, fastest accurate run wins.'
            : 'Incoming requests show as Respond — tap to accept or decline.'}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={theme.primary} />
      ) : (
        <FlatList
          data={classmates}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🎓</Text>
              <Text style={styles.emptyTitle}>No classmates yet</Text>
              <Text style={styles.emptyBody}>Share Tidbit with your class to see others here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.primaryLight,
    backgroundColor: theme.card,
  },
  backText: { fontSize: 16, fontWeight: '600', color: theme.primary, width: 56 },
  headerMeta: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.text },
  headerSub: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  hint: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  hintText: { fontSize: 13, color: theme.textSecondary, textAlign: 'center' },
  listContent: { padding: 16, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 14,
  },
  rowMeta: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: '600', color: theme.text },
  rowYear: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  duelBtn: {
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  duelBtnText: { fontSize: 13, fontWeight: '700', color: '#d97706' },

  buddyBtn: {
    borderWidth: 1.5,
    borderColor: theme.accent,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 76,
    alignItems: 'center',
  },
  buddyBtnActive: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  buddyBtnDisabled: {
    opacity: 0.6,
  },
  buddyBtnText: { fontSize: 13, fontWeight: '700', color: theme.accent },
  buddyBtnTextActive: { color: '#fff' },

  empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: theme.text, marginBottom: 6 },
  emptyBody: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 20 },
});
