/**
 * OnboardingScreen
 * Initial screen that requests permissions and starts photo scanning
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';

import { RootStackParamList, ScanProgress } from '@/types';
import { colors } from '@/config/colors';
import { spacing } from '@/config/spacing';
import MediaScanner from '@/services/MediaScanner';
import PermissionManager from '@/services/PermissionManager';
import DatabaseService from '@/services/DatabaseService';
import { refreshPhotosInStore } from '@/utils/photoLoader';

type OnboardingScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Onboarding'>;
};

interface OnboardingState {
  stage: 'welcome' | 'permissions' | 'scanning' | 'complete';
  isLoading: boolean;
  progress: ScanProgress | null;
  error: string | null;
}

export default function OnboardingScreen({ navigation }: OnboardingScreenProps) {
  const [state, setState] = useState<OnboardingState>({
    stage: 'welcome',
    isLoading: false,
    progress: null,
    error: null,
  });

  // Initialize database on screen focus
  useFocusEffect(
    useCallback(() => {
      initializeDatabase();
    }, [])
  );

  const initializeDatabase = async () => {
    try {
      await DatabaseService.initialize();
      
      // Clean up any duplicates from previous runs (development only)
      if (__DEV__) {
        const duplicatesRemoved = await DatabaseService.removeDuplicatePhotos();
        if (duplicatesRemoved > 0) {
          console.log(`Cleaned up ${duplicatesRemoved} duplicate photos`);
        }
      }
    } catch (error) {
      console.error('Database initialization failed:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to initialize app database'
      }));
    }
  };

  const handleGetStarted = () => {
    setState(prev => ({ ...prev, stage: 'permissions' }));
  };

  const handleRequestPermissions = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Request media library permission
      const mediaPermission = await PermissionManager.requestMediaLibraryPermission();
      
      if (!mediaPermission.granted) {
        if (mediaPermission.canAskAgain) {
          Alert.alert(
            'Permission Required',
            'ChronoMap needs access to your photos to organize them. Please grant permission in the next dialog.',
            [{ text: 'OK', onPress: handleRequestPermissions }]
          );
        } else {
          Alert.alert(
            'Permission Denied',
            'Please enable photo access in Settings to use ChronoMap.',
            [{ text: 'OK' }]
          );
        }
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Optional location permission for enhanced organization
      const locationPermission = await PermissionManager.requestLocationPermission();
      
      if (locationPermission.granted) {
        console.log('Location permission granted - enhanced organization available');
      } else {
        console.log('Location permission denied - basic organization only');
      }

      // Start photo scanning
      setState(prev => ({ ...prev, stage: 'scanning', isLoading: false }));
      await startPhotoScan();

    } catch (error) {
      console.error('Permission request error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to request permissions. Please try again.'
      }));
    }
  };

  const startPhotoScan = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const photoAssets = await MediaScanner.startFullScan((progress: ScanProgress) => {
        setState(prev => ({ ...prev, progress }));
      });

      console.log(`Scanned ${photoAssets.length} photos successfully`);

      // Store photos in database
      for (const asset of photoAssets) {
        try {
          const photoMetadata = {
            assetId: asset.id,
            filePath: asset.uri,
            filename: asset.filename,
            fileSize: 0, // Will be populated later if needed
            mimeType: asset.mediaType === 'photo' ? 'image/jpeg' : 'video/mp4',
            width: asset.width,
            height: asset.height,
            createdAt: new Date(asset.creationTime),
            modifiedAt: new Date(asset.modificationTime),
            scannedAt: new Date(),
            isDeleted: false,
            location: asset.location
          };

          await DatabaseService.insertOrUpdatePhoto(photoMetadata);
        } catch (dbError) {
          console.error('Error storing photo metadata:', dbError);
          // Continue with other photos even if one fails
        }
      }

      // Load photos from database into store
      try {
        await refreshPhotosInStore();
        console.log('Photos loaded into store after scanning');
      } catch (dbLoadError) {
        console.error('Error loading photos from database to store:', dbLoadError);
      }

      setState(prev => ({ 
        ...prev, 
        stage: 'complete', 
        isLoading: false,
        progress: {
          totalPhotos: photoAssets.length,
          processedPhotos: photoAssets.length,
          stage: 'complete',
          percentage: 100
        }
      }));

    } catch (error) {
      console.error('Photo scan error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to scan photos. Please try again.'
      }));
    }
  };

  const handleContinue = () => {
    navigation.replace('Timeline');
  };

  const renderWelcomeStage = () => (
    <View style={styles.contentContainer}>
      <Text style={styles.title}>Welcome to ChronoMap</Text>
      <Text style={styles.subtitle}>Privacy-First Photo Organization</Text>
      
      <View style={styles.descriptionContainer}>
        <Text style={styles.description}>
          Your photos, organized by time and location.{'\n'}
          All data stays on your device.
        </Text>
        
        <View style={styles.featureList}>
          <Text style={styles.feature}>• Timeline organization by date</Text>
          <Text style={styles.feature}>• Interactive map view</Text>
          <Text style={styles.feature}>• Privacy-first architecture</Text>
          <Text style={styles.feature}>• No cloud uploads required</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleGetStarted}
        disabled={state.isLoading}
      >
        <Text style={styles.primaryButtonText}>Get Started</Text>
      </TouchableOpacity>

      {__DEV__ && (
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={async () => {
            try {
              await DatabaseService.clearAllData();
              console.log('Database cleared for development');
            } catch (error) {
              console.error('Failed to clear database:', error);
            }
          }}
        >
          <Text style={styles.secondaryButtonText}>Clear DB (Dev)</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderPermissionsStage = () => (
    <View style={styles.contentContainer}>
      <Text style={styles.title}>App Permissions</Text>
      <Text style={styles.subtitle}>Required for photo organization</Text>
      
      <View style={styles.permissionContainer}>
        <View style={styles.permissionItem}>
          <Text style={styles.permissionTitle}>📱 Photo Library Access</Text>
          <Text style={styles.permissionDescription}>
            Required to scan and organize your photos
          </Text>
        </View>
        
        <View style={styles.permissionItem}>
          <Text style={styles.permissionTitle}>📍 Location (Optional)</Text>
          <Text style={styles.permissionDescription}>
            Enhances organization with location data
          </Text>
        </View>
      </View>

      <Text style={styles.privacyNote}>
        All data processing happens on your device.{'\n'}
        No information is sent to external servers.
      </Text>

      <TouchableOpacity
        style={[styles.primaryButton, state.isLoading && styles.disabledButton]}
        onPress={handleRequestPermissions}
        disabled={state.isLoading}
      >
        {state.isLoading ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <Text style={styles.primaryButtonText}>Grant Permissions</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderScanningStage = () => (
    <View style={styles.contentContainer}>
      <Text style={styles.title}>Scanning Photos</Text>
      <Text style={styles.subtitle}>Building your timeline...</Text>
      
      <View style={styles.progressContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        
        {state.progress && (
          <>
            <Text style={styles.progressText}>
              {state.progress.processedPhotos} of {state.progress.totalPhotos} photos
            </Text>
            <Text style={styles.progressPercentage}>
              {state.progress.percentage}% complete
            </Text>
            {state.progress.currentPhoto && (
              <Text style={styles.currentPhoto}>
                Processing: {state.progress.currentPhoto}
              </Text>
            )}
          </>
        )}
      </View>

      <Text style={styles.scanningNote}>
        This may take a few minutes for large photo libraries.{'\n'}
        The app will be faster after this initial scan.
      </Text>
    </View>
  );

  const renderCompleteStage = () => (
    <View style={styles.contentContainer}>
      <Text style={styles.title}>Setup Complete!</Text>
      <Text style={styles.subtitle}>Your photos are now organized</Text>
      
      <View style={styles.completionStats}>
        <Text style={styles.statsText}>
          {state.progress?.totalPhotos || 0} photos scanned
        </Text>
        <Text style={styles.statsDescription}>
          Ready to explore your timeline
        </Text>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleContinue}
      >
        <Text style={styles.primaryButtonText}>Continue to Timeline</Text>
      </TouchableOpacity>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{state.error}</Text>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => setState(prev => ({ ...prev, error: null, stage: 'welcome' }))}
      >
        <Text style={styles.secondaryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {state.error && renderError()}
      {!state.error && state.stage === 'welcome' && renderWelcomeStage()}
      {!state.error && state.stage === 'permissions' && renderPermissionsStage()}
      {!state.error && state.stage === 'scanning' && renderScanningStage()}
      {!state.error && state.stage === 'complete' && renderCompleteStage()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  descriptionContainer: {
    marginBottom: spacing.xl,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  featureList: {
    alignItems: 'flex-start',
  },
  feature: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  permissionContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  permissionItem: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  permissionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  privacyNote: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 16,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  progressContainer: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  progressText: {
    fontSize: 16,
    color: colors.text,
    marginTop: spacing.md,
  },
  progressPercentage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  currentPhoto: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  scanningNote: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
  completionStats: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  statsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  statsDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});