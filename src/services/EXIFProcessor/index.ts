/**
 * EXIFProcessor Service
 * Extracts and processes EXIF metadata from photos including GPS, camera settings, and timestamps
 * Handles timezone conversions and metadata validation
 */

import { EXIFData, LocationData, PhotoAsset } from '@/types';

export interface ProcessedMetadata {
  exifData: EXIFData;
  extractedLocation?: LocationData;
  creationDate: Date;
  modificationDate: Date;
  timezone?: string;
}

export class EXIFProcessor {
  private static instance: EXIFProcessor;

  static getInstance(): EXIFProcessor {
    if (!EXIFProcessor.instance) {
      EXIFProcessor.instance = new EXIFProcessor();
    }
    return EXIFProcessor.instance;
  }

  /**
   * Process EXIF data from a photo asset
   */
  async processPhotoMetadata(asset: PhotoAsset): Promise<ProcessedMetadata> {
    try {
      // Start with basic asset data
      const result: ProcessedMetadata = {
        exifData: {},
        creationDate: new Date(asset.creationTime),
        modificationDate: new Date(asset.modificationTime)
      };

      // Extract EXIF data if available
      result.exifData = await this.extractEXIFData(asset);
      
      // Extract GPS location from EXIF or asset data
      result.extractedLocation = this.extractLocationData(asset, result.exifData);
      
      // Process date/time with timezone handling
      const dateInfo = this.processDateTimeData(asset, result.exifData);
      result.creationDate = dateInfo.creationDate;
      result.timezone = dateInfo.timezone;

      return result;
    } catch (error) {
      console.error(`Error processing metadata for ${asset.filename}:`, error);
      
      // Return minimal metadata on error
      return {
        exifData: {},
        creationDate: new Date(asset.creationTime),
        modificationDate: new Date(asset.modificationTime)
      };
    }
  }

  /**
   * Extract EXIF data from image file
   * Note: This is a simplified implementation. In a real app, you'd use a library like piexifjs
   */
  private async extractEXIFData(asset: PhotoAsset): Promise<EXIFData> {
    try {
      // For now, we'll simulate EXIF extraction
      // In a real implementation, you would use a library like:
      // - piexifjs for web/React Native
      // - expo-image-manipulator for basic EXIF
      // - react-native-exif for advanced EXIF reading

      const exifData: EXIFData = {};

      // Check if we have basic GPS data from the asset
      if (asset.location) {
        exifData.gps = {
          latitude: asset.location.latitude,
          longitude: asset.location.longitude,
          altitude: asset.location.altitude,
          timestamp: new Date(asset.creationTime).toISOString()
        };
      }

      // Extract basic file information
      exifData.dimensions = {
        width: asset.width,
        height: asset.height,
        orientation: 1 // Default orientation
      };

      // Simulate camera data extraction (in real app, this would come from EXIF)
      exifData.camera = await this.simulateCameraData(asset);
      
      // Simulate camera settings (in real app, this would come from EXIF)
      exifData.settings = await this.simulateSettingsData(asset);

      return exifData;
    } catch (error) {
      console.error('Error extracting EXIF data:', error);
      return {};
    }
  }

  /**
   * Extract location data from asset or EXIF
   */
  private extractLocationData(asset: PhotoAsset, exifData: EXIFData): LocationData | undefined {
    // Prefer EXIF GPS data if available
    if (exifData.gps) {
      return {
        latitude: exifData.gps.latitude,
        longitude: exifData.gps.longitude,
        altitude: exifData.gps.altitude,
        accuracy: 10 // Default accuracy for EXIF GPS
      };
    }

    // Fall back to asset location
    if (asset.location) {
      return {
        latitude: asset.location.latitude,
        longitude: asset.location.longitude,
        altitude: asset.location.altitude,
        accuracy: asset.location.accuracy,
        heading: asset.location.heading,
        speed: asset.location.speed
      };
    }

    return undefined;
  }

  /**
   * Process date/time data with timezone handling
   */
  private processDateTimeData(asset: PhotoAsset, exifData: EXIFData): {
    creationDate: Date;
    timezone?: string;
  } {
    let creationDate = new Date(asset.creationTime);
    let timezone: string | undefined;

    // Try to extract more precise timestamp from EXIF
    if (exifData.dateTimeOriginal) {
      try {
        const exifDate = this.parseEXIFDateTime(exifData.dateTimeOriginal);
        if (exifDate) {
          creationDate = exifDate;
        }
      } catch (error) {
        console.error('Error parsing EXIF date:', error);
      }
    }

    // Try to determine timezone from GPS data and timestamp
    if (exifData.gps && exifData.gps.timestamp) {
      timezone = this.estimateTimezoneFromLocation(
        exifData.gps.latitude,
        exifData.gps.longitude,
        creationDate
      );
    }

    return { creationDate, timezone };
  }

  /**
   * Parse EXIF date/time format (YYYY:MM:DD HH:MM:SS)
   */
  private parseEXIFDateTime(exifDateTime: string): Date | null {
    try {
      // EXIF date format: "2023:12:25 14:30:45"
      const match = exifDateTime.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
      if (match) {
        const [, year, month, day, hour, minute, second] = match;
        return new Date(
          parseInt(year),
          parseInt(month) - 1, // Month is 0-indexed
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second)
        );
      }
      return null;
    } catch (error) {
      console.error('Error parsing EXIF date time:', error);
      return null;
    }
  }

  /**
   * Estimate timezone based on GPS coordinates
   * This is a simplified implementation - in production, use a proper timezone library
   */
  private estimateTimezoneFromLocation(
    latitude: number,
    longitude: number,
    timestamp: Date
  ): string {
    // Simplified timezone estimation based on longitude
    // In a real app, you'd use a library like moment-timezone or date-fns-tz
    
    const timezoneOffset = Math.round(longitude / 15); // Rough estimate: 15 degrees per hour
    const sign = timezoneOffset >= 0 ? '+' : '-';
    const hours = Math.abs(timezoneOffset);
    
    return `UTC${sign}${hours.toString().padStart(2, '0')}:00`;
  }

  /**
   * Simulate camera data extraction (placeholder for real EXIF implementation)
   */
  private async simulateCameraData(asset: PhotoAsset): Promise<EXIFData['camera']> {
    // In a real implementation, this would extract actual EXIF camera data
    const commonCameraMakes = ['Apple', 'Samsung', 'Google', 'Canon', 'Nikon', 'Sony'];
    const randomMake = commonCameraMakes[Math.floor(Math.random() * commonCameraMakes.length)];
    
    return {
      make: randomMake,
      model: randomMake === 'Apple' ? 'iPhone 14 Pro' : `${randomMake} Camera`,
      software: randomMake === 'Apple' ? 'iOS 16.0' : 'Android 13'
    };
  }

  /**
   * Simulate camera settings extraction (placeholder for real EXIF implementation)
   */
  private async simulateSettingsData(asset: PhotoAsset): Promise<EXIFData['settings']> {
    // In a real implementation, this would extract actual EXIF camera settings
    return {
      exposureTime: '1/60',
      fNumber: 2.8,
      iso: 100,
      focalLength: 26,
      flash: false
    };
  }

  /**
   * Validate extracted metadata for consistency and accuracy
   */
  validateMetadata(metadata: ProcessedMetadata): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Validate date consistency
    if (metadata.creationDate > new Date()) {
      warnings.push('Creation date is in the future');
    }

    if (metadata.creationDate > metadata.modificationDate) {
      warnings.push('Creation date is after modification date');
    }

    // Validate GPS coordinates
    if (metadata.extractedLocation) {
      const { latitude, longitude } = metadata.extractedLocation;
      
      if (latitude < -90 || latitude > 90) {
        errors.push(`Invalid latitude: ${latitude}`);
      }
      
      if (longitude < -180 || longitude > 180) {
        errors.push(`Invalid longitude: ${longitude}`);
      }
    }

    // Validate dimensions
    if (metadata.exifData.dimensions) {
      const { width, height } = metadata.exifData.dimensions;
      
      if (width <= 0 || height <= 0) {
        errors.push('Invalid image dimensions');
      }
      
      if (width > 10000 || height > 10000) {
        warnings.push('Unusually large image dimensions');
      }
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * Sanitize metadata for privacy (remove potentially sensitive EXIF data)
   */
  sanitizeMetadata(exifData: EXIFData, options: {
    removeLocation?: boolean;
    removeCameraInfo?: boolean;
    removeUserComments?: boolean;
  } = {}): EXIFData {
    const sanitized = { ...exifData };

    if (options.removeLocation && sanitized.gps) {
      delete sanitized.gps;
    }

    if (options.removeCameraInfo && sanitized.camera) {
      // Keep basic camera info but remove potentially identifying software
      sanitized.camera = {
        make: sanitized.camera.make,
        model: sanitized.camera.model
        // Remove software version
      };
    }

    // Remove any user comments or copyright info that might exist
    if (options.removeUserComments) {
      // In a real implementation, you'd remove user comment fields from EXIF
    }

    return sanitized;
  }
}

export default EXIFProcessor.getInstance();