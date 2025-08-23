/**
 * Settings Screen
 * Privacy controls and app preferences
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { colors, typography, spacing } from '../../config';

export function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <Text style={styles.sectionDescription}>
            ChronoMap is designed with privacy first. All your data stays on your device.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photo Library</Text>
          <Text style={styles.sectionDescription}>
            Permission status and scanning options will appear here.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.sectionDescription}>
            Version 1.0.0{'\n'}
            Privacy-first photo organization
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.screenPadding,
  },
  section: {
    marginBottom: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    ...typography.styles.h4,
    color: colors.textDark,
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    ...typography.styles.body,
    color: colors.text,
    lineHeight: 22,
  },
});