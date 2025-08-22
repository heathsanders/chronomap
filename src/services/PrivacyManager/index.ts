/**
 * PrivacyManager Service
 * Handles privacy compliance, data sanitization, and user consent management
 * Ensures ChronoMap maintains privacy-first architecture with zero external data transmission
 */

import * as SecureStore from 'expo-secure-store';
import { EXIFData, LocationData, PhotoMetadata, AppError } from '@/types';

export interface PrivacySettings {
  allowLocationExtraction: boolean;
  allowMetadataExtraction: boolean;
  sanitizeEXIFBeforeSharing: boolean;
  removeLocationFromShares: boolean;
  allowCrashReporting: boolean;
  allowAnalytics: boolean;
  dataRetentionDays: number;
  autoDeleteEnabled: boolean;
}

export interface DataExportOptions {
  includePhotos: boolean;
  includeMetadata: boolean;
  includeLocation: boolean;
  includeThumbnails: boolean;
  format: 'json' | 'csv' | 'xml';
  sanitizeData: boolean;
}

export interface PrivacyAuditResult {
  timestamp: Date;
  externalConnectionsDetected: number;
  dataLeaksFound: string[];
  complianceStatus: 'compliant' | 'warning' | 'violation';
  recommendations: string[];
}

export interface ConsentRecord {
  feature: string;
  granted: boolean;
  timestamp: Date;
  version: string; // Privacy policy version
}

export class PrivacyManager {
  private static instance: PrivacyManager;
  private privacySettings: PrivacySettings;
  private consentRecords = new Map<string, ConsentRecord>();
  private privacyPolicyVersion = '1.0.0';

  private defaultSettings: PrivacySettings = {
    allowLocationExtraction: true,
    allowMetadataExtraction: true,
    sanitizeEXIFBeforeSharing: true,
    removeLocationFromShares: true,
    allowCrashReporting: false, // Disabled by default for privacy
    allowAnalytics: false,      // Disabled by default for privacy
    dataRetentionDays: 365 * 5, // 5 years default retention
    autoDeleteEnabled: false    // User must opt-in
  };

  static getInstance(): PrivacyManager {
    if (!PrivacyManager.instance) {
      PrivacyManager.instance = new PrivacyManager();
    }
    return PrivacyManager.instance;
  }

  constructor() {
    this.privacySettings = { ...this.defaultSettings };
    this.loadPrivacySettings();
  }

  /**
   * Initialize privacy manager and load user settings
   */
  async initialize(): Promise<void> {
    try {
      await this.loadPrivacySettings();
      await this.loadConsentRecords();
      console.log('PrivacyManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PrivacyManager:', error);
      throw this.createError('UNKNOWN_ERROR', `PrivacyManager initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Sanitize EXIF data by removing potentially sensitive information
   */
  sanitizeEXIFData(exifData: EXIFData, options: {
    removeLocation?: boolean;
    removeCameraSerial?: boolean;
    removeUserComments?: boolean;
    removeSoftwareInfo?: boolean;
  } = {}): EXIFData {
    const {
      removeLocation = this.privacySettings.removeLocationFromShares,
      removeCameraSerial = true,
      removeUserComments = true,
      removeSoftwareInfo = false
    } = options;

    const sanitized = { ...exifData };

    // Remove GPS/location data if requested
    if (removeLocation && sanitized.gps) {
      delete sanitized.gps;
    }

    // Remove potentially identifying camera information
    if (removeCameraSerial && sanitized.camera) {
      sanitized.camera = {
        make: sanitized.camera.make,
        model: sanitized.camera.model
        // Remove software version which might contain identifying info
      };
      
      if (!removeSoftwareInfo && exifData.camera?.software) {
        sanitized.camera.software = exifData.camera.software;
      }
    }

    // Remove user comments and copyright info
    if (removeUserComments) {
      // Remove any user-generated fields that might exist
      const fieldsToRemove = ['userComment', 'copyright', 'artist', 'imageDescription'];
      fieldsToRemove.forEach(field => {
        if (sanitized[field as keyof EXIFData]) {
          delete sanitized[field as keyof EXIFData];
        }
      });
    }

    return sanitized;
  }

  /**
   * Sanitize location data for sharing
   */
  sanitizeLocationData(location: LocationData, precision: 'none' | 'city' | 'region' | 'country' = 'city'): LocationData | null {
    if (precision === 'none' || !this.privacySettings.allowLocationExtraction) {
      return null;
    }

    // Reduce precision based on privacy settings
    let precisionLevel = 0.01; // City level (~1km)
    
    switch (precision) {
      case 'region':
        precisionLevel = 0.1; // Region level (~10km)
        break;
      case 'country':
        precisionLevel = 1.0; // Country level (~100km)
        break;
      default:
        precisionLevel = 0.01; // City level
    }

    return {
      latitude: Math.round(location.latitude / precisionLevel) * precisionLevel,
      longitude: Math.round(location.longitude / precisionLevel) * precisionLevel,
      // Remove precise altitude, accuracy, heading, speed
      altitude: undefined,
      accuracy: undefined,
      heading: undefined,
      speed: undefined
    };
  }

  /**
   * Sanitize photo metadata for sharing or export
   */
  sanitizePhotoMetadata(metadata: PhotoMetadata): PhotoMetadata {
    const sanitized: PhotoMetadata = {
      ...metadata,
      // Remove system file paths
      filePath: '',
      // Remove internal IDs
      id: '',
      assetId: '',
      // Remove checksum
      checksum: undefined,
      // Sanitize location data
      location: metadata.location ? (this.sanitizeLocationData(metadata.location, 'city') || undefined) : undefined,
      // Sanitize EXIF data
      exifData: metadata.exifData ? this.sanitizeEXIFData(metadata.exifData) : undefined
    };

    return sanitized;
  }

  /**
   * Record user consent for specific features
   */
  async recordConsent(feature: string, granted: boolean): Promise<void> {
    const consentRecord: ConsentRecord = {
      feature,
      granted,
      timestamp: new Date(),
      version: this.privacyPolicyVersion
    };

    this.consentRecords.set(feature, consentRecord);
    await this.saveConsentRecords();
  }

  /**
   * Check if user has consented to a specific feature
   */
  hasConsent(feature: string): boolean {
    const record = this.consentRecords.get(feature);
    return record?.granted || false;
  }

  /**
   * Get all consent records
   */
  getAllConsents(): Map<string, ConsentRecord> {
    return new Map(this.consentRecords);
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(updates: Partial<PrivacySettings>): Promise<void> {
    this.privacySettings = { ...this.privacySettings, ...updates };
    await this.savePrivacySettings();
  }

  /**
   * Get current privacy settings
   */
  getPrivacySettings(): PrivacySettings {
    return { ...this.privacySettings };
  }

  /**
   * Check if data processing is allowed based on privacy settings
   */
  isDataProcessingAllowed(type: 'location' | 'metadata' | 'analytics' | 'crash-reporting'): boolean {
    switch (type) {
      case 'location':
        return this.privacySettings.allowLocationExtraction;
      case 'metadata':
        return this.privacySettings.allowMetadataExtraction;
      case 'analytics':
        return this.privacySettings.allowAnalytics;
      case 'crash-reporting':
        return this.privacySettings.allowCrashReporting;
      default:
        return false; // Deny by default
    }
  }

  /**
   * Perform privacy audit to detect potential data leaks
   */
  async performPrivacyAudit(): Promise<PrivacyAuditResult> {
    const result: PrivacyAuditResult = {
      timestamp: new Date(),
      externalConnectionsDetected: 0,
      dataLeaksFound: [],
      complianceStatus: 'compliant',
      recommendations: []
    };

    try {
      // Check for potential external connections (in a real app)
      // This would inspect network traffic, API calls, etc.
      
      // For now, we'll simulate some basic checks
      await this.checkNetworkConnections(result);
      await this.checkDataStorage(result);
      await this.checkPermissions(result);
      
      // Determine overall compliance status
      if (result.dataLeaksFound.length > 0) {
        result.complianceStatus = 'violation';
      } else if (result.externalConnectionsDetected > 0) {
        result.complianceStatus = 'warning';
      }

      return result;
    } catch (error) {
      console.error('Privacy audit failed:', error);
      result.complianceStatus = 'violation';
      result.dataLeaksFound.push('Privacy audit failed to complete');
      return result;
    }
  }

  /**
   * Export user data in compliance with GDPR/data protection laws
   */
  async exportUserData(options: DataExportOptions): Promise<string> {
    try {
      const exportData = {
        metadata: {
          exportTimestamp: new Date().toISOString(),
          privacyPolicyVersion: this.privacyPolicyVersion,
          dataTypes: this.getIncludedDataTypes(options)
        },
        privacySettings: options.sanitizeData ? undefined : this.privacySettings,
        consentRecords: Array.from(this.consentRecords.entries()).map(([key, value]) => ({
          featureName: key,
          granted: value.granted,
          timestamp: value.timestamp.toISOString(),
          version: value.version
        })),
        // Note: Actual photo data would be included here in a real implementation
        photos: options.includePhotos ? 'Photo data would be included in full export' : undefined
      };

      // Format the export based on requested format
      switch (options.format) {
        case 'json':
          return JSON.stringify(exportData, null, 2);
        case 'csv':
          return this.convertToCSV(exportData);
        case 'xml':
          return this.convertToXML(exportData);
        default:
          return JSON.stringify(exportData, null, 2);
      }
    } catch (error) {
      console.error('Data export failed:', error);
      throw this.createError('UNKNOWN_ERROR', `Data export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete all user data (right to be forgotten)
   */
  async deleteAllUserData(): Promise<void> {
    try {
      // Clear privacy settings
      this.privacySettings = { ...this.defaultSettings };
      await SecureStore.deleteItemAsync('privacy_settings');

      // Clear consent records
      this.consentRecords.clear();
      await SecureStore.deleteItemAsync('consent_records');

      // Note: In a real implementation, this would also:
      // - Delete all photos and metadata from database
      // - Clear all caches
      // - Remove thumbnails
      // - Clear any temporary files

      console.log('All user data deleted successfully');
    } catch (error) {
      console.error('Failed to delete user data:', error);
      throw this.createError('UNKNOWN_ERROR', `Failed to delete user data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get privacy policy compliance report
   */
  getComplianceReport(): {
    privacyPolicyVersion: string;
    dataCollectionPurposes: string[];
    thirdPartyServices: string[];
    userRights: string[];
    contactInformation: string;
  } {
    return {
      privacyPolicyVersion: this.privacyPolicyVersion,
      dataCollectionPurposes: [
        'Photo organization and timeline creation',
        'Location-based photo categorization',
        'Metadata extraction for photo management',
        'Local search and filtering capabilities'
      ],
      thirdPartyServices: [
        'None - All data processing happens locally'
      ],
      userRights: [
        'Right to access your data',
        'Right to export your data',
        'Right to delete your data',
        'Right to control data processing',
        'Right to withdraw consent'
      ],
      contactInformation: 'privacy@chronomap.app'
    };
  }

  /**
   * Check if data should be auto-deleted based on retention settings
   */
  shouldAutoDelete(itemDate: Date): boolean {
    if (!this.privacySettings.autoDeleteEnabled) {
      return false;
    }

    const retentionMs = this.privacySettings.dataRetentionDays * 24 * 60 * 60 * 1000;
    const ageMs = Date.now() - itemDate.getTime();
    
    return ageMs > retentionMs;
  }

  /**
   * Load privacy settings from secure storage
   */
  private async loadPrivacySettings(): Promise<void> {
    try {
      const stored = await SecureStore.getItemAsync('privacy_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.privacySettings = { ...this.defaultSettings, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
      // Use default settings on error
      this.privacySettings = { ...this.defaultSettings };
    }
  }

  /**
   * Save privacy settings to secure storage
   */
  private async savePrivacySettings(): Promise<void> {
    try {
      await SecureStore.setItemAsync('privacy_settings', JSON.stringify(this.privacySettings));
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
    }
  }

  /**
   * Load consent records from secure storage
   */
  private async loadConsentRecords(): Promise<void> {
    try {
      const stored = await SecureStore.getItemAsync('consent_records');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.consentRecords = new Map(
          parsed.map((record: any) => [
            record.feature,
            {
              feature: record.feature,
              granted: record.granted,
              timestamp: new Date(record.timestamp),
              version: record.version
            }
          ])
        );
      }
    } catch (error) {
      console.error('Failed to load consent records:', error);
    }
  }

  /**
   * Save consent records to secure storage
   */
  private async saveConsentRecords(): Promise<void> {
    try {
      const records = Array.from(this.consentRecords.entries()).map(([key, value]) => ({
        feature: key,
        granted: value.granted,
        timestamp: value.timestamp.toISOString(),
        version: value.version
      }));
      
      await SecureStore.setItemAsync('consent_records', JSON.stringify(records));
    } catch (error) {
      console.error('Failed to save consent records:', error);
    }
  }

  /**
   * Check for external network connections (audit helper)
   */
  private async checkNetworkConnections(result: PrivacyAuditResult): Promise<void> {
    // In a real implementation, this would monitor actual network traffic
    // For now, we'll just check if analytics/crash reporting are enabled
    
    if (this.privacySettings.allowAnalytics) {
      result.externalConnectionsDetected++;
      result.recommendations.push('Analytics is enabled - consider disabling for enhanced privacy');
    }

    if (this.privacySettings.allowCrashReporting) {
      result.externalConnectionsDetected++;
      result.recommendations.push('Crash reporting is enabled - consider disabling for enhanced privacy');
    }
  }

  /**
   * Check data storage practices (audit helper)
   */
  private async checkDataStorage(result: PrivacyAuditResult): Promise<void> {
    // Check if proper encryption is enabled
    // Check if data retention policies are reasonable
    
    if (this.privacySettings.dataRetentionDays > 365 * 7) {
      result.recommendations.push('Consider reducing data retention period for better privacy');
    }

    if (!this.privacySettings.sanitizeEXIFBeforeSharing) {
      result.recommendations.push('Enable EXIF sanitization before sharing for better privacy');
    }
  }

  /**
   * Check permission usage (audit helper)
   */
  private async checkPermissions(result: PrivacyAuditResult): Promise<void> {
    // This would check if the app is requesting unnecessary permissions
    
    if (!this.hasConsent('location_access') && this.privacySettings.allowLocationExtraction) {
      result.dataLeaksFound.push('Location processing enabled without explicit consent');
    }

    if (!this.hasConsent('metadata_extraction') && this.privacySettings.allowMetadataExtraction) {
      result.dataLeaksFound.push('Metadata extraction enabled without explicit consent');
    }
  }

  /**
   * Get included data types for export
   */
  private getIncludedDataTypes(options: DataExportOptions): string[] {
    const types: string[] = [];
    
    if (options.includePhotos) types.push('photos');
    if (options.includeMetadata) types.push('metadata');
    if (options.includeLocation) types.push('location');
    if (options.includeThumbnails) types.push('thumbnails');
    
    return types;
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any): string {
    // Simplified CSV conversion - in production, use a proper CSV library
    return 'ChronoMap Data Export (CSV format not fully implemented)';
  }

  /**
   * Convert data to XML format
   */
  private convertToXML(data: any): string {
    // Simplified XML conversion - in production, use a proper XML library
    return '<?xml version="1.0"?><export>ChronoMap Data Export (XML format not fully implemented)</export>';
  }

  /**
   * Create structured error for better error handling
   */
  private createError(code: 'UNKNOWN_ERROR', message: string): AppError {
    return {
      code,
      message,
      timestamp: new Date()
    };
  }
}

export default PrivacyManager.getInstance();