/**
 * PermissionManager Service
 * Handles all app permissions with privacy-first approach and clear user communication
 */

import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';
import { AppPermissions, PermissionStatus } from '@/types';

export class PermissionManager {
  private static instance: PermissionManager;
  private permissions: AppPermissions = {
    mediaLibrary: { granted: false, canAskAgain: true, status: 'undetermined' },
    location: { granted: false, canAskAgain: true, status: 'undetermined' }
  };

  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  /**
   * Request photo library permission with clear privacy rationale
   */
  async requestMediaLibraryPermission(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();
      
      const permissionStatus: PermissionStatus = {
        granted: status === 'granted',
        canAskAgain,
        status: status as 'granted' | 'denied' | 'undetermined'
      };

      this.permissions.mediaLibrary = permissionStatus;
      return permissionStatus;
    } catch (error) {
      console.error('Error requesting media library permission:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied'
      };
    }
  }

  /**
   * Request location permission for photo geo-tagging
   */
  async requestLocationPermission(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      
      const permissionStatus: PermissionStatus = {
        granted: status === 'granted',
        canAskAgain,
        status: status as 'granted' | 'denied' | 'undetermined'
      };

      this.permissions.location = permissionStatus;
      return permissionStatus;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied'
      };
    }
  }

  /**
   * Check current media library permission status
   */
  async checkMediaLibraryPermission(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await MediaLibrary.getPermissionsAsync();
      
      const permissionStatus: PermissionStatus = {
        granted: status === 'granted',
        canAskAgain,
        status: status as 'granted' | 'denied' | 'undetermined'
      };

      this.permissions.mediaLibrary = permissionStatus;
      return permissionStatus;
    } catch (error) {
      console.error('Error checking media library permission:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied'
      };
    }
  }

  /**
   * Check current location permission status
   */
  async checkLocationPermission(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
      
      const permissionStatus: PermissionStatus = {
        granted: status === 'granted',
        canAskAgain,
        status: status as 'granted' | 'denied' | 'undetermined'
      };

      this.permissions.location = permissionStatus;
      return permissionStatus;
    } catch (error) {
      console.error('Error checking location permission:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied'
      };
    }
  }

  /**
   * Get all current permissions status
   */
  async getAllPermissions(): Promise<AppPermissions> {
    await Promise.all([
      this.checkMediaLibraryPermission(),
      this.checkLocationPermission()
    ]);

    return { ...this.permissions };
  }

  /**
   * Check if we have all required permissions for core functionality
   */
  async hasRequiredPermissions(): Promise<boolean> {
    const permissions = await this.getAllPermissions();
    return permissions.mediaLibrary.granted;
  }

  /**
   * Check if we have optional permissions for enhanced functionality
   */
  async hasOptionalPermissions(): Promise<{ location: boolean }> {
    const permissions = await this.getAllPermissions();
    return {
      location: permissions.location.granted
    };
  }

  /**
   * Get privacy rationale messages for permission requests
   */
  getPermissionRationale(permissionType: keyof AppPermissions): {
    title: string;
    message: string;
    benefits: string[];
  } {
    switch (permissionType) {
      case 'mediaLibrary':
        return {
          title: 'Access Your Photos',
          message: 'ChronoMap needs access to your photo library to organize and display your photos in timeline and map views.',
          benefits: [
            'Organize photos by date and location',
            'All processing happens on your device',
            'No photos are uploaded to the internet',
            'Your privacy is completely protected'
          ]
        };
      
      case 'location':
        return {
          title: 'Location for Photo Context',
          message: 'Location access helps ChronoMap show where your photos were taken on the interactive map.',
          benefits: [
            'See photos organized by location on map',
            'Automatic location tagging for new photos',
            'Location data stays on your device',
            'Can be disabled at any time'
          ]
        };
      
      default:
        return {
          title: 'Permission Required',
          message: 'This permission helps ChronoMap provide you with a better experience.',
          benefits: ['Enhanced functionality']
        };
    }
  }

  /**
   * Get user-friendly error messages for permission denials
   */
  getPermissionDenialMessage(permissionType: keyof AppPermissions): {
    title: string;
    message: string;
    actions: string[];
  } {
    switch (permissionType) {
      case 'mediaLibrary':
        return {
          title: 'Photos Access Required',
          message: 'ChronoMap cannot organize your photos without access to your photo library. This is essential for the app to function.',
          actions: [
            'Enable in Settings → ChronoMap → Photos',
            'All photo processing happens locally on your device',
            'No data is shared with external services'
          ]
        };
      
      case 'location':
        return {
          title: 'Location Access Optional',
          message: 'You can still use ChronoMap without location access, but you will not see the map view or location-based photo organization.',
          actions: [
            'Enable in Settings → ChronoMap → Location if you change your mind',
            'Timeline view will still work perfectly',
            'You can manually add locations later'
          ]
        };
      
      default:
        return {
          title: 'Permission Required',
          message: 'This permission helps ChronoMap provide you with the best experience.',
          actions: ['Check app settings to enable']
        };
    }
  }

  /**
   * Monitor permission changes (useful for handling when user changes permissions in system settings)
   */
  startPermissionMonitoring(callback: (permissions: AppPermissions) => void) {
    // Check permissions every 5 seconds when app is active
    const interval = setInterval(async () => {
      const currentPermissions = await this.getAllPermissions();
      
      // Check if permissions have changed
      if (
        currentPermissions.mediaLibrary.granted !== this.permissions.mediaLibrary.granted ||
        currentPermissions.location.granted !== this.permissions.location.granted
      ) {
        callback(currentPermissions);
      }
    }, 5000);

    return () => clearInterval(interval);
  }
}

export default PermissionManager.getInstance();