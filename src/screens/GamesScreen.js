/**
 * Games hub — Daily Challenge, Speed Duel, Speed Run, Match, Infinite Runner.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { GAME_CATALOG, GAME_TYPE } from '../config/gameCatalog';
import { SpeedDuelService } from '../services/SpeedDuelService';
import { GroupService } from '../services/GroupService';
import { ClassService } from '../services/ClassService';

export default function GamesScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [inbox, setInbox] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pickingFor, setPickingFor] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [pending, myGroups] = await Promise.all([
        SpeedDuelService.getInbox(),
        GroupService.getMyGroups(),
      ]);
      setInbox(pending);
      const unique = [];
      const seen = new Set();
      for (const g of myGroups) {
        if (seen.has(g.classId)) continue;
        seen.add(g.classId);
        unique.push(g);
      }
      setGroups(unique);
    } catch (e) {
      console.warn('[GamesScreen] load:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const startDuelForClass = (group) => {
    setPickingFor(null);
    navigation.navigate('GroupClassmates', {
      classId: group.classId,
      code: group.code,
      title: group.title,
      duelMode: true,
    });
  };

  const startRunnerForClass = (group) => {
    setPickingFor(null);
    const slug = ClassService.getCategoryForClass(group.classId);
    if (!slug) {
      Alert.alert('No class deck yet', 'This class needs a preset deck to run.');
      return;
    }
    navigation.navigate('InfiniteRunner', {
      classId: group.classId,
      categorySlug: slug,
      classCode: group.code,
    });
  };

  const classesWithDecks = groups.filter((g) => ClassService.hasTidbitContent(g.classId));

  const handleCatalogPress = (game) => {
    if (game.type === GAME_TYPE.SPEED_DUEL) {
      if (groups.length === 0) {
        Alert.alert('Join a class first', 'Speed Duel is class-scoped — enroll, then challenge a classmate.');
        return;
      }
      if (groups.length === 1) {
        startDuelForClass(groups[0]);
        return;
      }
      setPickingFor('duel');
      return;
    }
    if (game.type === GAME_TYPE.RUNNER) {
      if (!classesWithDecks.length) {
        Alert.alert('Join a class first', 'Infinite Runner uses your class deck. Enroll in a class with cards, then run.');
        return;
      }
      if (classesWithDecks.length === 1) {
        startRunnerForClass(classesWithDecks[0]);
        return;
      }
      setPickingFor('runner');
      return;
    }
    if (game.type === GAME_TYPE.DAILY_CHALLENGE) {
      if (!classesWithDecks.length) {
        Alert.alert('No class deck yet', 'Join a class with a preset deck to play the Daily Challenge.');
        return;
      }
      const g = classesWithDecks[0];
      const slug = ClassService.getCategoryForClass(g.classId);
      navigation.navigate('DailyChallenge', { categorySlug: slug, categoryName: g.code });
      return;
    }
    if (game.type === GAME_TYPE.SPEED_RUN || game.type === GAME_TYPE.MATCH) {
      navigation.navigate('LearnModePicker');
      return;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Study</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Games</Text>
        <View style={{ width: 56 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={theme.primary} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} />}
        >
          {inbox.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your duels</Text>
              {inbox.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={styles.inboxCard}
                  onPress={() => navigation.navigate('SpeedDuel', {
                    challengeId: d.id,
                    opponentName: d.role === 'challenger' ? d.opponentName : d.challengerName,
                  })}
                  activeOpacity={0.85}
                >
                  <Text style={styles.inboxEmoji}>⚔️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inboxTitle}>
                      {d.awaitingMe
                        ? `${d.role === 'opponent' ? d.challengerName : d.opponentName} is waiting`
                        : `Waiting on ${d.opponentName}`}
                    </Text>
                    <Text style={styles.inboxSub}>{d.classCode} · 10 cards · definition → term</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {pickingFor && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {pickingFor === 'runner' ? 'Run in which class?' : 'Duel in which class?'}
              </Text>
              {(pickingFor === 'duel' ? groups : classesWithDecks).map((g) => (
                <TouchableOpacity
                  key={g.groupId}
                  style={styles.inboxCard}
                  onPress={() => {
                    if (pickingFor === 'runner') startRunnerForClass(g);
                    else startDuelForClass(g);
                  }}
                >
                  <Text style={styles.inboxTitle}>{g.code}</Text>
                  <Text style={styles.inboxSub}>{g.title}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => setPickingFor(null)}>
                <Text style={styles.cancelPick}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {GAME_CATALOG.map((game) => (
            <GameRow key={game.type} game={game} styles={styles} onPress={() => handleCatalogPress(game)} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function GameRow({ game, styles, onPress }) {
  return (
    <TouchableOpacity style={styles.gameRow} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.gameEmoji}>{game.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.gameTitle}>{game.title}</Text>
        <Text style={styles.gameSub}>{game.subtitle}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
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
  back: { fontSize: 16, fontWeight: '600', color: theme.primary, width: 56 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: theme.text },
  scroll: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: theme.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  inboxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: theme.accent,
  },
  inboxEmoji: { fontSize: 22 },
  inboxTitle: { fontSize: 15, fontWeight: '700', color: theme.text },
  inboxSub: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  cancelPick: { textAlign: 'center', color: theme.primary, fontWeight: '600', marginTop: 8 },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  gameEmoji: { fontSize: 26 },
  gameTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
  gameSub: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
  chevron: { fontSize: 22, color: theme.textSecondary, fontWeight: '600' },
});
