/**
 * Map Screen
 * Interactive map showing photos by location
 */

import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { colors, typography, spacing } from "../../config";

export function MapScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Map View</Text>
          <Text style={styles.emptyDescription}>
            Photos with location data will appear on an interactive map here.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
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