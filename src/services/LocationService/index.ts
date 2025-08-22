/**
 * LocationService
 * Handles location data processing, GPS validation, reverse geocoding, and location intelligence
 * Privacy-first approach with offline-capable geocoding and coordinate validation
 */

import * as Location from 'expo-location';
import { LocationData, AppError } from '@/types';

export interface GeocodeResult {
  address: string;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  confidence: number;
}

export interface LocationCluster {
  id: string;
  centerLatitude: number;
  centerLongitude: number;
  radius: number; // in meters
  photoCount: number;
  displayName: string;
  confidence: number;
}

export interface LocationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalizedLocation?: LocationData;
}

export class LocationService {
  private static instance: LocationService;
  private geocodeCache = new Map<string, GeocodeResult>();
  private reverseGeocodeCache = new Map<string, GeocodeResult>();
  
  // Offline city/region database (simplified for privacy)
  private offlineLocations = new Map<string, GeocodeResult>();

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  constructor() {
    this.initializeOfflineDatabase();
  }

  /**
   * Validate GPS coordinates and return normalized location data
   */
  validateLocation(location: LocationData): LocationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate latitude
    if (typeof location.latitude !== 'number' || isNaN(location.latitude)) {
      errors.push('Invalid latitude: must be a number');
    } else if (location.latitude < -90 || location.latitude > 90) {
      errors.push(`Invalid latitude: ${location.latitude} (must be between -90 and 90)`);
    }

    // Validate longitude
    if (typeof location.longitude !== 'number' || isNaN(location.longitude)) {
      errors.push('Invalid longitude: must be a number');
    } else if (location.longitude < -180 || location.longitude > 180) {
      errors.push(`Invalid longitude: ${location.longitude} (must be between -180 and 180)`);
    }

    // Validate optional altitude
    if (location.altitude !== undefined) {
      if (typeof location.altitude !== 'number' || isNaN(location.altitude)) {
        warnings.push('Invalid altitude: should be a number');
      } else if (location.altitude < -500 || location.altitude > 9000) {
        warnings.push(`Unusual altitude: ${location.altitude}m (expected range: -500 to 9000m)`);
      }
    }

    // Validate accuracy
    if (location.accuracy !== undefined) {
      if (typeof location.accuracy !== 'number' || isNaN(location.accuracy)) {
        warnings.push('Invalid accuracy: should be a number');
      } else if (location.accuracy < 0) {
        warnings.push('Invalid accuracy: should be positive');
      } else if (location.accuracy > 1000) {
        warnings.push(`Low accuracy: ${location.accuracy}m (location may be imprecise)`);
      }
    }

    // Check for null island (0,0) coordinates - often indicates GPS errors
    if (location.latitude === 0 && location.longitude === 0) {
      errors.push('Invalid coordinates: (0,0) detected - likely GPS error');
    }

    // Normalize the location data
    const normalizedLocation: LocationData | undefined = errors.length === 0 ? {
      latitude: this.normalizeLatitude(location.latitude),
      longitude: this.normalizeLongitude(location.longitude),
      altitude: location.altitude ? Math.round(location.altitude * 100) / 100 : undefined,
      accuracy: location.accuracy ? Math.round(location.accuracy * 100) / 100 : undefined,
      heading: location.heading,
      speed: location.speed
    } : undefined;

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      normalizedLocation
    };
  }

  /**
   * Perform reverse geocoding to get address from coordinates
   * Uses offline fallback for privacy compliance
   */
  async reverseGeocode(
    latitude: number,
    longitude: number,
    options: { useOfflineOnly?: boolean; maxResults?: number } = {}
  ): Promise<GeocodeResult | null> {
    const { useOfflineOnly = false } = options;
    
    // Create cache key
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    
    // Check cache first
    if (this.reverseGeocodeCache.has(cacheKey)) {
      return this.reverseGeocodeCache.get(cacheKey) || null;
    }

    try {
      let result: GeocodeResult | null = null;

      // Try offline geocoding first (privacy-first approach)
      result = await this.offlineReverseGeocode(latitude, longitude);

      // If offline fails and online is allowed, use Expo Location API
      if (!result && !useOfflineOnly) {
        result = await this.onlineReverseGeocode(latitude, longitude);
      }

      // Cache the result
      if (result) {
        this.reverseGeocodeCache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return null;
    }
  }

  /**
   * Calculate distance between two coordinates in meters
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Calculate bearing (direction) from one coordinate to another
   */
  calculateBearing(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const x = Math.sin(Δλ) * Math.cos(φ2);
    const y = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(x, y);

    return ((θ * 180) / Math.PI + 360) % 360; // Convert to degrees and normalize
  }

  /**
   * Create location clusters from an array of coordinates
   */
  createLocationClusters(
    locations: { latitude: number; longitude: number; id: string }[],
    options: {
      maxDistance?: number; // meters
      minPoints?: number;
      maxClusters?: number;
    } = {}
  ): LocationCluster[] {
    const { maxDistance = 1000, minPoints = 2, maxClusters = 100 } = options;
    
    if (locations.length === 0) {
      return [];
    }

    const clusters: LocationCluster[] = [];
    const processed = new Set<string>();

    for (const location of locations) {
      if (processed.has(location.id)) {
        continue;
      }

      // Find nearby locations
      const nearbyLocations = locations.filter(other => {
        if (processed.has(other.id) || other.id === location.id) {
          return false;
        }

        const distance = this.calculateDistance(
          location.latitude,
          location.longitude,
          other.latitude,
          other.longitude
        );

        return distance <= maxDistance;
      });

      // Create cluster if we have enough points
      if (nearbyLocations.length + 1 >= minPoints) {
        const allPoints = [location, ...nearbyLocations];
        
        // Calculate cluster center
        const centerLat = allPoints.reduce((sum, p) => sum + p.latitude, 0) / allPoints.length;
        const centerLon = allPoints.reduce((sum, p) => sum + p.longitude, 0) / allPoints.length;

        // Calculate cluster radius
        const distances = allPoints.map(p => 
          this.calculateDistance(centerLat, centerLon, p.latitude, p.longitude)
        );
        const radius = Math.max(...distances);

        // Create cluster
        const cluster: LocationCluster = {
          id: this.generateClusterId(),
          centerLatitude: centerLat,
          centerLongitude: centerLon,
          radius,
          photoCount: allPoints.length,
          displayName: 'Loading...', // Will be updated asynchronously
          confidence: this.calculateClusterConfidence(allPoints.length, radius)
        };

        // Update display name asynchronously
        this.generateClusterDisplayName(centerLat, centerLon).then(name => {
          cluster.displayName = name;
        });

        clusters.push(cluster);

        // Mark all points as processed
        allPoints.forEach(p => processed.add(p.id));
      } else {
        // Create single-point cluster
        const cluster: LocationCluster = {
          id: this.generateClusterId(),
          centerLatitude: location.latitude,
          centerLongitude: location.longitude,
          radius: 0,
          photoCount: 1,
          displayName: 'Loading...', // Will be updated asynchronously
          confidence: 1.0
        };

        // Update display name asynchronously
        this.generateClusterDisplayName(location.latitude, location.longitude).then(name => {
          cluster.displayName = name;
        });

        clusters.push(cluster);
        processed.add(location.id);
      }

      // Limit number of clusters
      if (clusters.length >= maxClusters) {
        break;
      }
    }

    return clusters.sort((a, b) => b.photoCount - a.photoCount);
  }

  /**
   * Check if coordinates are within a specific geographic region
   */
  isWithinRegion(
    latitude: number,
    longitude: number,
    region: {
      northEast: { latitude: number; longitude: number };
      southWest: { latitude: number; longitude: number };
    }
  ): boolean {
    return (
      latitude >= region.southWest.latitude &&
      latitude <= region.northEast.latitude &&
      longitude >= region.southWest.longitude &&
      longitude <= region.northEast.longitude
    );
  }

  /**
   * Get timezone estimate from coordinates
   */
  estimateTimezone(latitude: number, longitude: number): string {
    // Simplified timezone estimation based on longitude
    // In production, use a proper timezone library like moment-timezone
    const timezoneOffset = Math.round(longitude / 15);
    const sign = timezoneOffset >= 0 ? '+' : '-';
    const hours = Math.abs(timezoneOffset);
    
    return `UTC${sign}${hours.toString().padStart(2, '0')}:00`;
  }

  /**
   * Normalize latitude to valid range
   */
  private normalizeLatitude(latitude: number): number {
    return Math.max(-90, Math.min(90, latitude));
  }

  /**
   * Normalize longitude to valid range
   */
  private normalizeLongitude(longitude: number): number {
    // Normalize to -180 to 180 range
    let normalized = longitude % 360;
    if (normalized > 180) {
      normalized -= 360;
    } else if (normalized < -180) {
      normalized += 360;
    }
    return normalized;
  }

  /**
   * Perform offline reverse geocoding using cached location data
   */
  private async offlineReverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<GeocodeResult | null> {
    // Find the closest known location in our offline database
    let closestLocation: GeocodeResult | null = null;
    let minDistance = Infinity;

    for (const [coords, locationInfo] of this.offlineLocations.entries()) {
      const [lat, lon] = coords.split(',').map(Number);
      const distance = this.calculateDistance(latitude, longitude, lat, lon);
      
      if (distance < minDistance && distance < 50000) { // Within 50km
        minDistance = distance;
        closestLocation = {
          ...locationInfo,
          confidence: Math.max(0.1, 1 - (distance / 50000)) // Reduce confidence with distance
        };
      }
    }

    return closestLocation;
  }

  /**
   * Perform online reverse geocoding using Expo Location API
   */
  private async onlineReverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<GeocodeResult | null> {
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      if (results.length > 0) {
        const result = results[0];
        
        return {
          address: this.formatAddress(result),
          city: result.city || result.subregion || undefined,
          region: result.region || undefined,
          country: result.country || undefined,
          postalCode: result.postalCode || undefined,
          confidence: 0.8 // Moderate confidence for online results
        };
      }

      return null;
    } catch (error) {
      console.error('Online reverse geocoding failed:', error);
      return null;
    }
  }

  /**
   * Format address from geocoding result
   */
  private formatAddress(result: any): string {
    const parts = [
      result.streetNumber,
      result.street,
      result.city || result.subregion,
      result.region,
      result.country
    ].filter(Boolean);

    return parts.join(', ');
  }

  /**
   * Initialize offline location database with major cities/regions
   */
  private initializeOfflineDatabase(): void {
    // Add major world cities for basic offline geocoding
    // In production, this would be loaded from a comprehensive offline database
    const majorLocations = [
      { coords: '40.7128,-74.0060', info: { address: 'New York, NY, USA', city: 'New York', region: 'New York', country: 'USA', confidence: 0.9 }},
      { coords: '34.0522,-118.2437', info: { address: 'Los Angeles, CA, USA', city: 'Los Angeles', region: 'California', country: 'USA', confidence: 0.9 }},
      { coords: '51.5074,-0.1278', info: { address: 'London, UK', city: 'London', region: 'England', country: 'United Kingdom', confidence: 0.9 }},
      { coords: '48.8566,2.3522', info: { address: 'Paris, France', city: 'Paris', region: 'Île-de-France', country: 'France', confidence: 0.9 }},
      { coords: '35.6762,139.6503', info: { address: 'Tokyo, Japan', city: 'Tokyo', region: 'Tokyo', country: 'Japan', confidence: 0.9 }},
      { coords: '-33.8688,151.2093', info: { address: 'Sydney, NSW, Australia', city: 'Sydney', region: 'New South Wales', country: 'Australia', confidence: 0.9 }},
      { coords: '37.7749,-122.4194', info: { address: 'San Francisco, CA, USA', city: 'San Francisco', region: 'California', country: 'USA', confidence: 0.9 }}
    ];

    majorLocations.forEach(({ coords, info }) => {
      this.offlineLocations.set(coords, info);
    });
  }

  /**
   * Generate cluster display name from coordinates
   */
  private async generateClusterDisplayName(latitude: number, longitude: number): Promise<string> {
    const geocodeResult = await this.reverseGeocode(latitude, longitude, { useOfflineOnly: true });
    
    if (geocodeResult) {
      return geocodeResult.city || geocodeResult.region || geocodeResult.country || 'Unknown Location';
    }

    // Fallback to coordinate-based name
    const latDir = latitude >= 0 ? 'N' : 'S';
    const lonDir = longitude >= 0 ? 'E' : 'W';
    return `${Math.abs(latitude).toFixed(2)}°${latDir}, ${Math.abs(longitude).toFixed(2)}°${lonDir}`;
  }

  /**
   * Calculate confidence score for location cluster
   */
  private calculateClusterConfidence(photoCount: number, radius: number): number {
    // More photos = higher confidence
    // Smaller radius = higher confidence
    const photoScore = Math.min(1, photoCount / 10);
    const radiusScore = Math.max(0, 1 - (radius / 5000)); // Penalize clusters larger than 5km
    
    return (photoScore + radiusScore) / 2;
  }

  /**
   * Generate unique cluster ID
   */
  private generateClusterId(): string {
    return `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create structured error for better error handling
   */
  private createError(code: 'DATABASE_ERROR' | 'NETWORK_ERROR', message: string): AppError {
    return {
      code,
      message,
      timestamp: new Date()
    };
  }

  /**
   * Clear geocoding caches
   */
  clearCache(): void {
    this.geocodeCache.clear();
    this.reverseGeocodeCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { geocodeEntries: number; reverseGeocodeEntries: number } {
    return {
      geocodeEntries: this.geocodeCache.size,
      reverseGeocodeEntries: this.reverseGeocodeCache.size
    };
  }
}

export default LocationService.getInstance();