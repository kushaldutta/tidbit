import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { spacing, radius, type, elevation } from '../theme/tokens';

export default function WelcomeScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const handleGetStarted = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.title}>Tidbit</Text>
          <Text style={styles.tagline}>Study with your class</Text>
        </View>

        <Text style={styles.description}>
          Course-native flashcards, a daily class challenge, and classmates who are
          actually in the same lecture. Compete, collaborate, and cram smart.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleGetStarted}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Get Started</Text>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: 64,
    fontWeight: '700',
    color: theme.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
    // Large display type needs negative tracking or it reads as loose.
    letterSpacing: -1.5,
  },
  tagline: {
    ...type.title,
    color: theme.primary,
    textAlign: 'center',
  },
  description: {
    ...type.body,
    color: theme.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  // Anchoring the CTA to the bottom gives the screen a stable shape and puts the
  // button in the thumb zone instead of floating mid-screen.
  footer: {
    paddingHorizontal: spacing.xxxl,
    paddingBottom: spacing.xxl,
  },
  button: {
    backgroundColor: theme.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    ...elevation.raised,
    shadowColor: theme.primary,
    shadowOpacity: 0.3,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
