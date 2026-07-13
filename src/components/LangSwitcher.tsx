import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useLang } from '../i18n/LangContext';
import { colors, spacing, radius } from '../theme';
import type { Lang } from '../i18n/translations';

const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'sv', label: 'SV' },
];

export default function LangSwitcher() {
  const { lang, setLang } = useLang();
  return (
    <View style={styles.row}>
      {LANGS.map((l) => (
        <TouchableOpacity
          key={l.code}
          style={[styles.chip, lang === l.code && styles.chipActive]}
          onPress={() => setLang(l.code)}
        >
          <Text style={[styles.label, lang === l.code && styles.labelActive]}>{l.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.full,
    padding: 3,
  },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  chipActive: {
    backgroundColor: colors.red,
    shadowColor: colors.red,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  label: { color: 'rgba(255,255,255,0.45)', fontSize: 10.5, fontWeight: '800', letterSpacing: 1 },
  labelActive: { color: colors.white },
});
