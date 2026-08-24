/**
 * NavRow — the standard "tap to go somewhere" row.
 *
 * One shape for every destination row in the app so screens read as a list of
 * places rather than a pile of differently-styled banners: leading icon, title,
 * sub, trailing chevron.
 *
 * `tone` picks the treatment. Give exactly ONE row per screen `accent` — it is
 * the primary action, and a screen with three accents has none. `warn` is the
 * warm variant (coins, streaks) and matches the insight card on Home.
 *
 *   <NavRow icon="decks" title="My Decks" sub="…" onPress={…} />
 *   <NavRow icon="ai" title="Upgrade" sub="…" onPress={…} tone="accent" />
 *   <NavRow icon="buddy" title="Buddy requests" sub="…" badge={3} onPress={…} />
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';
import { spacing, radius, iconSize } from '../theme/tokens';

export default function NavRow({
  icon,
  title,
  sub,
  onPress,
  tone = 'plain',
  /** Replaces the leading icon — an avatar, a deck cover emoji, a progress ring. */
  leading,
  /** Renders a count pill instead of the chevron. Falsy or 0 keeps the chevron. */
  badge,
  /** Replaces the trailing chevron entirely. */
  trailing,
  style,
}) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const accent = tone === 'accent';
  const warn = tone === 'warn';

  const iconColor = accent ? theme.primary : warn ? theme.warningText : theme.textSecondary;
  const titleColor = accent ? theme.primary : theme.text;
  const subColor = accent ? theme.primary : warn ? theme.warningText : theme.textSecondary;

  return (
    <TouchableOpacity
      style={[styles.row, accent && styles.rowAccent, warn && styles.rowWarn, style]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {leading || (
        <Icon
          name={icon}
          size={iconSize.lg}
          color={iconColor}
          filled={accent}
          style={styles.icon}
        />
      )}
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
        {sub ? <Text style={[styles.sub, { color: subColor }]}>{sub}</Text> : null}
      </View>
      {trailing
        || (badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : (
          <Icon
            name="chevron"
            size={iconSize.md}
            color={accent ? theme.primary : theme.textMuted}
          />
        ))}
    </TouchableOpacity>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  rowAccent: {
    backgroundColor: theme.primaryLight,
    borderWidth: 1.5,
    borderColor: theme.accent,
  },
  rowWarn: {
    backgroundColor: theme.warningBg,
    borderWidth: 1.5,
    borderColor: theme.warning,
  },
  icon: { marginRight: spacing.md },
  title: { fontSize: 16, fontWeight: '600' },
  sub: { fontSize: 13, marginTop: 2 },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  badgeText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
});
