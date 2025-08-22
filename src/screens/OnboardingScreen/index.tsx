/**
 * Onboarding Screen
 * Privacy-first introduction and permissions setup
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from "react-native";
import { colors, typography, spacing } from "../../config";
import { Button } from "../../components/common";
import { usePhotoLibrary } from "../../hooks/usePhotoLibrary";
import { useUIStore } from "../../stores/uiStore";

export function OnboardingScreen() {
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const { permissionStatus, requestPermission, isLoading } = usePhotoLibrary();
  const { setOnboardingComplete } = useUIStore();

  const handleRequestPermission = async () => {
    try {
      setIsRequestingPermission(true);
      const result = await requestPermission();

      if (result.status === "granted") {
        setOnboardingComplete(true);
      } else if (result.status === "denied") {
        Alert.alert(
          "Permission Required",
          "ChronoMap needs access to your photo library to organize your photos. You can enable this in Settings later.",
          [
            { text: "OK", style: "default" },
            {
              text: "Continue Anyway",
              style: "cancel",
              onPress: () => setOnboardingComplete(true),
            },
          ]
        );
      }
    } catch (error) {
      console.error("Permission request failed:", error);
      Alert.alert("Error", "Failed to request permission. Please try again.", [
        { text: "OK", style: "default" },
      ]);
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      "Skip Permission",
      "You can grant photo library access later in Settings. Some features may be limited.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Skip",
          style: "destructive",
          onPress: () => setOnboardingComplete(true),
        },
      ]
    );
  };

  const isPermissionGranted = permissionStatus.granted;
  const showPermissionButtons = !isPermissionGranted;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to ChronoMap</Text>
          <Text style={styles.subtitle}>
            Your photos, organized by time and location.{"\n"}
            All data stays on your device.
          </Text>
        </View>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Text style={styles.featureTitle}>🔒 Privacy First</Text>
            <Text style={styles.featureDescription}>
              All processing happens on your device. Your photos never leave
              your phone.
            </Text>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureTitle}>⏰ Timeline View</Text>
            <Text style={styles.featureDescription}>
              Browse your memories chronologically with smooth, fast scrolling.
            </Text>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureTitle}>🗺️ Map Exploration</Text>
            <Text style={styles.featureDescription}>
              Discover your photos on an interactive map by location.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          {showPermissionButtons ? (
            <>
              <Text style={styles.footerText}>
                Ready to get started? We'll need access to your photo library.
              </Text>
              <View style={styles.buttonContainer}>
                <Button
                  title="Grant Photo Access"
                  onPress={handleRequestPermission}
                  loading={isLoading || isRequestingPermission}
                  fullWidth
                  style={styles.primaryButton}
                />
                <Button
                  title="Skip for Now"
                  onPress={handleSkip}
                  variant="ghost"
                  fullWidth
                  style={styles.secondaryButton}
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.footerText}>
                ✅ Photo library access granted! Ready to explore your
                memories.
              </Text>
              <Button
                title="Get Started"
                onPress={() => setOnboardingComplete(true)}
                fullWidth
                style={styles.primaryButton}
              />
            </>
          )}
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
    justifyContent: "space-between",
  },
  header: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  title: {
    ...typography.styles.h1,
    color: colors.textDark,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.styles.bodyLarge,
    color: colors.text,
    textAlign: "center",
    lineHeight: 26,
  },
  features: {
    flex: 2,
    justifyContent: "center",
  },
  feature: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  featureTitle: {
    ...typography.styles.h4,
    color: colors.textDark,
    marginBottom: spacing.xs,
  },
  featureDescription: {
    ...typography.styles.body,
    color: colors.text,
    lineHeight: 22,
  },
  footer: {
    paddingVertical: spacing.xl,
  },
  footerText: {
    ...typography.styles.body,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  buttonContainer: {
    width: "100%",
  },
  primaryButton: {
    marginBottom: spacing.md,
  },
  secondaryButton: {
    marginTop: spacing.xs,
  },
});