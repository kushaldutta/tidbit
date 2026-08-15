/**
 * Inbox for incoming study-buddy requests.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import BuddyRequestsCard from '../components/BuddyRequestsCard';

export default function BuddyRequestsScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Buddy requests</Text>
        <View style={{ width: 56 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <BuddyRequestsCard
          emptyMessage="No pending requests. When a classmate taps + Buddy, it shows up here so you can accept or decline without hunting through Speed Duel."
        />
        <Text style={styles.hint}>
          Add a buddy from a class page → Classmates.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  back: { fontSize: 16, fontWeight: '600', color: theme.primary, width: 56 },
  title: { fontSize: 17, fontWeight: '800', color: theme.text },
  scroll: { padding: 16, paddingBottom: 40 },
  hint: {
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 20,
    marginTop: 4,
    paddingHorizontal: 4,
  },
});
