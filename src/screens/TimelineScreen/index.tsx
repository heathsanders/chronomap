/**
 * Timeline Screen
 * Main chronological photo browsing interface
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { colors, typography, spacing } from "../../config";

export function TimelineScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Photos Yet</Text>
          <Text style={styles.emptyDescription}>
            Once you grant photo library permissions, your photos will appear
            here organized by date.
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
    flexGrow: 1,
    padding: spacing.screenPadding,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    ...typography.styles.h3,
    color: colors.textDark,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  emptyDescription: {
    ...typography.styles.body,
    color: colors.text,
    textAlign: "center",
    lineHeight: 24,
  },
});