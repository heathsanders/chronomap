export default {
  expo: {
    name: 'ChronoMap',
    slug: 'chronomap',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#F7FAFC',
    },
    updates: {
      fallbackToCacheTimeout: 0,
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.chronomap.app',
      buildNumber: '1.0.0',
      infoPlist: {
        NSPhotoLibraryUsageDescription: 'ChronoMap needs access to your photos to organize them by date and location. All processing happens on your device.',
        NSLocationWhenInUseUsageDescription: 'ChronoMap reads location data from your photos to show them on the map. Location data never leaves your device.',
        NSCameraUsageDescription: 'ChronoMap can capture new photos to add to your timeline.',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#F7FAFC',
      },
      package: 'com.chronomap.app',
      versionCode: 1,
      permissions: [
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'CAMERA',
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-media-library',
      'expo-location',
      'expo-file-system',
      'expo-secure-store',
      [
        'expo-build-properties',
        {
          ios: {
            deploymentTarget: '14.0',
          },
          android: {
            compileSdkVersion: 34,
            targetSdkVersion: 34,
            minSdkVersion: 30,
            buildToolsVersion: '34.0.0',
            proguardMinifyEnabled: true,
          },
        },
      ],
    ],
  },
};