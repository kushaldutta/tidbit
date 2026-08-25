import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StorageService } from '../services/StorageService';
import { AnalyticsService } from '../services/AnalyticsService';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/Icon';
import { spacing, radius, type, elevation, iconSize } from '../theme/tokens';

/**
 * `hint` sets expectations up front so the choice isn't abstract.
 * Counts assume the default quiet hours (11 PM – 9 AM), i.e. a 14-hour window,
 * with the 10 PM slot handled by the bedtime brief.
 */
const INTERVAL_OPTIONS = [
  { label: '1 hour', value: 60, hint: 'About 14 a day' },
  { label: '2 hours', value: 120, hint: 'About 7 a day' },
  { label: '4 hours', value: 240, hint: 'About 4 a day' },
];

export default function FrequencySelectionScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [selectedInterval, setSelectedInterval] = useState(60);

  const handleIntervalSelect = async (interval) => {
    setSelectedInterval(interval);
    await StorageService.setNotificationInterval(interval);
  };

  const handleNext = () => {
    AnalyticsService.track('frequency_selected', { interval_minutes: selectedInterval });
    navigation.navigate('PermissionRequest');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>How often?</Text>
        <Text style={styles.subtitle}>
          How frequently a card from your decks should appear. You can change this
          later, and quiet hours keep them out of the night.
        </Text>

        <View style={styles.optionsContainer}>
          {INTERVAL_OPTIONS.map((option) => {
            const selected = selectedInterval === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => handleIntervalSelect(option.value)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {option.label}
                  </Text>
                  <Text style={styles.optionHint}>{option.hint}</Text>
                </View>
                {selected && (
                  <Icon name="check" size={iconSize.lg} color={theme.primary} filled />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.card,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.xxxl,
    paddingTop: spacing.xl,
  },
  title: {
    ...type.display,
    color: theme.text,
    marginBottom: spacing.md,
  },
  subtitle: {
    ...type.body,
    color: theme.textSecondary,
    marginBottom: spacing.xxxl,
  },
  optionsContainer: {
    gap: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: theme.surfaceAlt,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    backgroundColor: theme.primaryLight,
    borderColor: theme.primary,
  },
  optionText: {
    ...type.subheading,
    fontSize: 18,
    color: theme.text,
  },
  optionTextSelected: {
    color: theme.primary,
    fontWeight: '700',
  },
  optionHint: {
    ...type.caption,
    color: theme.textSecondary,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: spacing.xxxl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.lg,
  },
  nextButton: {
    backgroundColor: theme.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    ...elevation.raised,
    shadowColor: theme.primary,
    shadowOpacity: 0.3,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
