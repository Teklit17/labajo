import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useCountry, Country } from '../i18n/CountryContext';
import { colors, spacing, radius } from '../theme';

export default function CountrySwitcher() {
  return (
    <View style={styles.row}>
      <View style={[styles.chip, styles.chipActive]}>
        <Text style={styles.flag}>🇸🇪</Text>
        <Text style={[styles.label, styles.labelActive]}>SEK</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  chipActive: { backgroundColor: colors.red, borderColor: colors.red },
  flag: { fontSize: 14 },
  label: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  labelActive: { color: colors.white },
});
