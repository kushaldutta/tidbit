import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, THEMES } from '../context/ThemeContext';
import PremiumGate from '../components/PremiumGate';

function ThemePickerInner({ navigation }) {
  const { theme, setThemeId, themeId } = useTheme();

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
          Choose a colour palette for the entire app. Your pick is saved to your account.
        </Text>

        {Object.values(THEMES).map((t) => {
          const active = t.id === themeId;
          return (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.themeCard,
                { backgroundColor: theme.card, borderColor: active ? theme.primary : theme.primaryLight },
                active && styles.themeCardActive,
              ]}
              onPress={() => setThemeId(t.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.swatch, { backgroundColor: t.primary }]} />
              <View style={[styles.swatchSmall, { backgroundColor: t.accent, marginLeft: 8 }]} />
              <Text style={[styles.themeName, { color: theme.text }]}>
                {t.emoji}  {t.label}
              </Text>
              {active && (
                <View style={[styles.checkBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Live preview block */}
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

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.primary }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>Save & Apply Theme →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function ThemePickerScreen({ navigation, route }) {
  return (
    <PremiumGate navigation={navigation} feature="Custom Themes">
      <ThemePickerInner navigation={navigation} route={route} />
    </PremiumGate>
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
  swatch: { width: 28, height: 28, borderRadius: 14 },
  swatchSmall: { width: 16, height: 16, borderRadius: 8, marginRight: 12 },
  themeName: { flex: 1, fontSize: 16, fontWeight: '700' },
  checkBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  checkText: { color: '#fff', fontWeight: '900', fontSize: 14 },

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
