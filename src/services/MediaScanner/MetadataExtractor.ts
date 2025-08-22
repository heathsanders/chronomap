// MetadataExtractor - Extract EXIF and other metadata from photos and videos
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import type {
  MediaAsset,
  ExtractedMetadata,
  ExifData,
  CameraData,
  LocationData,
  MetadataExtractionError
} from './types';

export class MetadataExtractor {
  private static readonly TIMEOUT_MS = 10000; // 10 seconds
  private static readonly MAX_RETRIES = 3;

  /**
   * Extract all metadata from a media asset
   */
  static async extractMetadata(asset: MediaAsset): Promise<ExtractedMetadata | null> {
    try {
      console.log(`Extracting metadata for: ${asset.filename}`);

      const metadata: ExtractedMetadata = {
        errors: []
      };

      // Extract EXIF data (for photos)
      if (asset.mediaType === 'photo') {
        try {
          const exifData = await this.extractExifData(asset);
          if (exifData) {
            metadata.exif = exifData;
            
            // Extract camera info from EXIF
            metadata.camera = this.extractCameraData(exifData);
            
            // Extract location from EXIF GPS data
            const locationData = this.extractLocationFromExif(exifData);
            if (locationData) {
              metadata.location = locationData;
            }
          }
        } catch (error) {
          console.warn(`EXIF extraction failed for ${asset.filename}:`, error);
          metadata.errors?.push(`EXIF extraction failed: ${error.message}`);
        }
      }

      // Extract basic metadata for videos
      if (asset.mediaType === 'video') {
        try {
          const videoMetadata = await this.extractVideoMetadata(asset);
          if (videoMetadata) {
            metadata.custom = videoMetadata;
          }
        } catch (error) {
          console.warn(`Video metadata extraction failed for ${asset.filename}:`, error);
          metadata.errors?.push(`Video metadata extraction failed: ${error.message}`);
        }
      }

      // Add file-based metadata
      try {
        const fileMetadata = await this.extractFileMetadata(asset);
        metadata.custom = { ...metadata.custom, ...fileMetadata };
      } catch (error) {
        console.warn(`File metadata extraction failed for ${asset.filename}:`, error);
        metadata.errors?.push(`File metadata extraction failed: ${error.message}`);
      }

      return metadata;
    } catch (error) {
      console.error(`Metadata extraction failed for ${asset.filename}:`, error);
      throw new MetadataExtractionError(
        `Failed to extract metadata: ${error.message}`,
        asset.uri,
        { asset }
      );
    }
  }

  /**
   * Extract EXIF data from photo
   */
  private static async extractExifData(asset: MediaAsset): Promise<ExifData | null> {
    try {
      // Use expo-media-library to get asset info with location
      const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.id);
      
      if (!assetInfo.exif) {
        console.log(`No EXIF data available for ${asset.filename}`);
        return null;
      }

      const exif = assetInfo.exif;
      const exifData: ExifData = {};

      // DateTime fields
      if (exif.DateTime) exifData.DateTime = exif.DateTime;
      if (exif.DateTimeOriginal) exifData.DateTimeOriginal = exif.DateTimeOriginal;
      if (exif.DateTimeDigitized) exifData.DateTimeDigitized = exif.DateTimeDigitized;

      // Camera info
      if (exif.Make) exifData.Make = exif.Make;
      if (exif.Model) exifData.Model = exif.Model;
      if (exif.Software) exifData.Software = exif.Software;
      if (exif.Orientation !== undefined) exifData.Orientation = exif.Orientation;

      // Camera settings
      if (exif.ExposureTime !== undefined) exifData.ExposureTime = exif.ExposureTime;
      if (exif.FNumber !== undefined) exifData.FNumber = exif.FNumber;
      if (exif.ISO !== undefined) exifData.ISO = exif.ISO;
      if (exif.ISOSpeedRatings !== undefined) exifData.ISO = exif.ISOSpeedRatings;
      if (exif.FocalLength !== undefined) exifData.FocalLength = exif.FocalLength;
      if (exif.Flash !== undefined) exifData.Flash = exif.Flash;
      if (exif.WhiteBalance !== undefined) exifData.WhiteBalance = exif.WhiteBalance;

      // Image properties
      if (exif.ColorSpace !== undefined) exifData.ColorSpace = exif.ColorSpace;
      if (exif.PixelXDimension !== undefined) exifData.PixelXDimension = exif.PixelXDimension;
      if (exif.PixelYDimension !== undefined) exifData.PixelYDimension = exif.PixelYDimension;

      // GPS data (if available)
      if (assetInfo.location) {
        exifData.GPSLatitude = assetInfo.location.latitude;
        exifData.GPSLongitude = assetInfo.location.longitude;
        if (assetInfo.location.altitude) {
          exifData.GPSAltitude = assetInfo.location.altitude;
        }
      }

      // Additional fields
      if (exif.ImageDescription) exifData.ImageDescription = exif.ImageDescription;
      if (exif.UserComment) exifData.UserComment = exif.UserComment;
      if (exif.Artist) exifData.Artist = exif.Artist;
      if (exif.Copyright) exifData.Copyright = exif.Copyright;

      // Technical details
      if (exif.Compression !== undefined) exifData.Compression = exif.Compression;
      if (exif.BitsPerSample) exifData.BitsPerSample = exif.BitsPerSample;
      if (exif.PhotometricInterpretation !== undefined) exifData.PhotometricInterpretation = exif.PhotometricInterpretation;
      if (exif.SamplesPerPixel !== undefined) exifData.SamplesPerPixel = exif.SamplesPerPixel;
      if (exif.PlanarConfiguration !== undefined) exifData.PlanarConfiguration = exif.PlanarConfiguration;
      if (exif.XResolution !== undefined) exifData.XResolution = exif.XResolution;
      if (exif.YResolution !== undefined) exifData.YResolution = exif.YResolution;
      if (exif.ResolutionUnit !== undefined) exifData.ResolutionUnit = exif.ResolutionUnit;

      return exifData;
    } catch (error) {
      console.error(`Failed to extract EXIF data for ${asset.filename}:`, error);
      return null;
    }
  }

  /**
   * Extract camera data from EXIF
   */
  private static extractCameraData(exif: ExifData): CameraData {
    const camera: CameraData = {};

    if (exif.Make) camera.make = exif.Make;
    if (exif.Model) camera.model = exif.Model;
    if (exif.Software) camera.software = exif.Software;

    // Try to extract lens information from various EXIF fields
    // Note: Different cameras store lens info in different fields
    // This is a simplified version - more comprehensive extraction would
    // check multiple possible fields

    return camera;
  }

  /**
   * Extract location data from EXIF GPS fields
   */
  private static extractLocationFromExif(exif: ExifData): LocationData | null {
    if (!exif.GPSLatitude || !exif.GPSLongitude) {
      return null;
    }

    const location: LocationData = {
      latitude: exif.GPSLatitude,
      longitude: exif.GPSLongitude
    };

    if (exif.GPSAltitude !== undefined) {
      location.altitude = exif.GPSAltitude;
    }

    if (exif.GPSSpeed !== undefined) {
      location.speed = exif.GPSSpeed;
    }

    if (exif.GPSImgDirection !== undefined) {
      location.direction = exif.GPSImgDirection;
    }

    // Convert GPS timestamp if available
    if (exif.GPSTimeStamp) {
      location.timestamp = this.parseGPSTimestamp(exif.GPSTimeStamp);
    }

    return location;
  }

  /**
   * Extract video metadata
   */
  private static async extractVideoMetadata(asset: MediaAsset): Promise<Record<string, any> | null> {
    try {
      // Get detailed asset info
      const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.id);
      
      const videoMetadata: Record<string, any> = {
        duration: asset.duration,
        mediaType: 'video',
        filename: asset.filename,
        width: asset.width,
        height: asset.height,
        creationTime: asset.creationTime,
        modificationTime: asset.modificationTime
      };

      // Add any additional video-specific metadata that might be available
      if (assetInfo.mediaSubtypes) {
        videoMetadata.mediaSubtypes = assetInfo.mediaSubtypes;
      }

      // Add location if available
      if (assetInfo.location) {
        videoMetadata.location = {
          latitude: assetInfo.location.latitude,
          longitude: assetInfo.location.longitude,
          altitude: assetInfo.location.altitude
        };
      }

      return videoMetadata;
    } catch (error) {
      console.error(`Failed to extract video metadata for ${asset.filename}:`, error);
      return null;
    }
  }

  /**
   * Extract file-based metadata
   */
  private static async extractFileMetadata(asset: MediaAsset): Promise<Record<string, any>> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      
      const fileMetadata: Record<string, any> = {
        fileSize: fileInfo.size || 0,
        fileName: asset.filename,
        mediaType: asset.mediaType,
        uri: asset.uri,
        dimensions: {
          width: asset.width,
          height: asset.height,
          aspectRatio: asset.width && asset.height ? asset.width / asset.height : 1
        }
      };

      // Extract file extension and MIME type
      const extension = asset.filename.split('.').pop()?.toLowerCase();
      if (extension) {
        fileMetadata.fileExtension = extension;
        fileMetadata.mimeType = this.getMimeTypeFromExtension(extension);
      }

      // Add media subtypes if available
      if (asset.mediaSubtypes && asset.mediaSubtypes.length > 0) {
        fileMetadata.mediaSubtypes = asset.mediaSubtypes;
      }

      return fileMetadata;
    } catch (error) {
      console.error(`Failed to extract file metadata for ${asset.filename}:`, error);
      return {};
    }
  }

  /**
   * Get MIME type from file extension
   */
  private static getMimeTypeFromExtension(extension: string): string {
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'webp': 'image/webp',
      'heic': 'image/heic',
      'heif': 'image/heif',
      'tiff': 'image/tiff',
      'tif': 'image/tiff',
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'wmv': 'video/x-ms-wmv',
      'flv': 'video/x-flv',
      'webm': 'video/webm',
      'm4v': 'video/x-m4v'
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * Parse GPS timestamp
   */
  private static parseGPSTimestamp(gpsTimestamp: string): number {
    try {
      // GPS timestamp is usually in format "HH:MM:SS" or as an array
      // This is a simplified parser - in reality, GPS timestamp parsing
      // can be quite complex depending on the format
      
      if (typeof gpsTimestamp === 'string') {
        // Try to parse as time string
        const timeMatch = gpsTimestamp.match(/(\d{1,2}):(\d{1,2}):(\d{1,2})/);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const seconds = parseInt(timeMatch[3]);
          
          // Convert to seconds since midnight
          return hours * 3600 + minutes * 60 + seconds;
        }
      }

      // If parsing fails, return current timestamp
      return Date.now();
    } catch (error) {
      console.warn('Failed to parse GPS timestamp:', gpsTimestamp, error);
      return Date.now();
    }
  }

  /**
   * Batch extract metadata from multiple assets
   */
  static async batchExtractMetadata(
    assets: MediaAsset[],
    batchSize: number = 10,
    onProgress?: (processed: number, total: number) => void
  ): Promise<Array<{ asset: MediaAsset; metadata: ExtractedMetadata | null; error?: string }>> {
    const results: Array<{ asset: MediaAsset; metadata: ExtractedMetadata | null; error?: string }> = [];
    
    for (let i = 0; i < assets.length; i += batchSize) {
      const batch = assets.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (asset) => {
        try {
          const metadata = await this.extractMetadata(asset);
          return { asset, metadata };
        } catch (error) {
          console.error(`Batch metadata extraction failed for ${asset.filename}:`, error);
          return { 
            asset, 
            metadata: null, 
            error: error.message 
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error('Batch promise failed:', result.reason);
        }
      });

      // Notify progress
      if (onProgress) {
        onProgress(Math.min(i + batchSize, assets.length), assets.length);
      }

      // Small delay to prevent overwhelming the system
      if (i + batchSize < assets.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    return results;
  }

  /**
   * Validate extracted metadata
   */
  static validateMetadata(metadata: ExtractedMetadata): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Validate EXIF data
    if (metadata.exif) {
      // Check for reasonable date values
      if (metadata.exif.DateTime) {
        const dateTime = new Date(metadata.exif.DateTime);
        if (dateTime.getFullYear() < 1900 || dateTime.getFullYear() > new Date().getFullYear() + 1) {
          warnings.push('DateTime appears to be invalid');
        }
      }

      // Check for reasonable GPS coordinates
      if (metadata.exif.GPSLatitude !== undefined && metadata.exif.GPSLongitude !== undefined) {
        if (Math.abs(metadata.exif.GPSLatitude) > 90) {
          errors.push('Invalid GPS latitude');
        }
        if (Math.abs(metadata.exif.GPSLongitude) > 180) {
          errors.push('Invalid GPS longitude');
        }
      }

      // Check for reasonable camera settings
      if (metadata.exif.FNumber !== undefined && (metadata.exif.FNumber < 0.5 || metadata.exif.FNumber > 100)) {
        warnings.push('F-number appears unusual');
      }

      if (metadata.exif.ISO !== undefined && (metadata.exif.ISO < 25 || metadata.exif.ISO > 1000000)) {
        warnings.push('ISO value appears unusual');
      }
    }

    // Validate location data
    if (metadata.location) {
      if (Math.abs(metadata.location.latitude) > 90) {
        errors.push('Invalid location latitude');
      }
      if (Math.abs(metadata.location.longitude) > 180) {
        errors.push('Invalid location longitude');
      }
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * Sanitize metadata for privacy
   */
  static sanitizeMetadata(
    metadata: ExtractedMetadata,
    privacyLevel: 'minimal' | 'standard' | 'high' = 'standard'
  ): ExtractedMetadata {
    const sanitized: ExtractedMetadata = JSON.parse(JSON.stringify(metadata));

    switch (privacyLevel) {
      case 'high':
        // Remove all potentially identifying information
        if (sanitized.exif) {
          delete sanitized.exif.GPSLatitude;
          delete sanitized.exif.GPSLongitude;
          delete sanitized.exif.GPSAltitude;
          delete sanitized.exif.UserComment;
          delete sanitized.exif.ImageDescription;
          delete sanitized.exif.Artist;
          delete sanitized.exif.Copyright;
          delete sanitized.exif.Software;
        }
        delete sanitized.location;
        if (sanitized.custom) {
          delete sanitized.custom.location;
        }
        break;

      case 'standard':
        // Remove personal identifiers but keep location
        if (sanitized.exif) {
          delete sanitized.exif.UserComment;
          delete sanitized.exif.ImageDescription;
          delete sanitized.exif.Artist;
          delete sanitized.exif.Copyright;
        }
        break;

      case 'minimal':
        // Only remove obvious personal data
        if (sanitized.exif) {
          delete sanitized.exif.UserComment;
        }
        break;
    }

    return sanitized;
  }
}

export default MetadataExtractor;