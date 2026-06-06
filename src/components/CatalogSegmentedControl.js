import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { schoolsForCatalog, DEFAULT_SCHOOL_ID } from '../config/schools';

export default function CatalogSegmentedControl({ value, onChange, theme, preferredSchoolId }) {
  const styles = makeStyles(theme);
  const schools = useMemo(
    () => schoolsForCatalog(preferredSchoolId || DEFAULT_SCHOOL_ID),
    [preferredSchoolId]
  );

  return (
    <View style={styles.row}>
      {schools.map((school) => {
        const active = value === school.id;
        return (
          <TouchableOpacity
            key={school.id}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(school.id)}
            activeOpacity={0.85}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
              {school.segmentLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: theme.primaryLight || '#eef2ff',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: theme.card || '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary || '#6b7280',
    textAlign: 'center',
  },
  segmentTextActive: {
    color: theme.primary || '#4338ca',
    fontWeight: '800',
  },
});
