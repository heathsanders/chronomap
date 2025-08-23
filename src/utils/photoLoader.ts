/**
 * Photo Loader Utility
 * Handles loading photos from database into PhotoStore
 */

import { PhotoAsset } from '@/types';
import DatabaseService from '@/services/DatabaseService';
import { usePhotoStore } from '@/stores/photoStore';

/**
 * Load all photos from database and populate PhotoStore
 */
export async function loadPhotosFromDatabase(): Promise<PhotoAsset[]> {
  try {
    console.log('Loading photos from database...');
    
    // Get all photos from database (paginated to handle large libraries)
    const dbPhotos = await DatabaseService.getPhotos({ 
      limit: 50000, // Large enough to get all photos for most users
      offset: 0,
      includeDeleted: false 
    });

    // Convert database photos to PhotoAsset format
    const storePhotos: PhotoAsset[] = dbPhotos.map(dbPhoto => ({
      id: dbPhoto.assetId,
      uri: dbPhoto.filePath,
      filename: dbPhoto.filename,
      width: dbPhoto.width,
      height: dbPhoto.height,
      creationTime: dbPhoto.createdAt.getTime(),
      modificationTime: dbPhoto.modifiedAt.getTime(),
      mediaType: dbPhoto.mimeType.startsWith('image/') ? 'photo' : 'video' as 'photo' | 'video',
      mediaSubtypes: [],
      albumId: dbPhoto.assetId,
      duration: undefined, // Could be populated from EXIF if available
      location: dbPhoto.location
    }));

    console.log(`Loaded ${storePhotos.length} photos from database`);
    if (storePhotos.length > 0) {
      console.log('Sample photo data:', JSON.stringify(storePhotos[0], null, 2));
    }
    return storePhotos;

  } catch (error) {
    console.error('Error loading photos from database:', error);
    return [];
  }
}

/**
 * Load photos from database and update PhotoStore
 */
export async function refreshPhotosInStore(): Promise<void> {
  try {
    const storePhotos = await loadPhotosFromDatabase();
    
    // Update the store
    const { setPhotos } = usePhotoStore.getState();
    setPhotos(storePhotos);
    
    console.log(`Updated PhotoStore with ${storePhotos.length} photos`);
    
    // Debug: Check if photos are actually in the store
    const { allPhotos } = usePhotoStore.getState();
    console.log(`PhotoStore now contains ${allPhotos.length} photos`);
    if (allPhotos.length > 0) {
      console.log('Sample store photo:', JSON.stringify({
        id: allPhotos[0].id,
        filename: allPhotos[0].filename,
        creationTime: allPhotos[0].creationTime,
        mediaType: allPhotos[0].mediaType
      }));
    }
  } catch (error) {
    console.error('Error refreshing photos in store:', error);
  }
}

/**
 * Check if photos need to be loaded on app startup
 */
export async function initializePhotosOnStartup(): Promise<boolean> {
  try {
    // Check if store already has photos
    const { allPhotos } = usePhotoStore.getState();
    
    if (allPhotos.length > 0) {
      console.log(`PhotoStore already has ${allPhotos.length} photos`);
      return true;
    }

    // Check if database has photos
    const photoCount = await DatabaseService.getPhotoCount(false);
    
    if (photoCount === 0) {
      console.log('No photos in database');
      return false;
    }

    console.log(`Found ${photoCount} photos in database, loading into store...`);
    await refreshPhotosInStore();
    
    return true;
  } catch (error) {
    console.error('Error initializing photos on startup:', error);
    return false;
  }
}