/**
 * Photo Library Permission Hook
 * Manages media library permissions and access
 */

import { useState, useEffect, useCallback } from "react";
import * as MediaLibrary from "expo-media-library";
import { useUIStore } from "../../stores/uiStore";
import { PermissionStatus, PermissionResult } from "../../types";

interface UsePhotoLibraryReturn {
  permissionStatus: PermissionStatus;
  isLoading: boolean;
  requestPermission: () => Promise<PermissionResult>;
  checkPermission: () => Promise<PermissionStatus>;
  error: string | null;
}

export function usePhotoLibrary(): UsePhotoLibraryReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { permissions, setPermissionStatus } = useUIStore();
  const mediaLibraryStatus = permissions.mediaLibrary;

  const checkPermission = useCallback(async (): Promise<PermissionStatus> => {
    try {
      const { status } = await MediaLibrary.getPermissionsAsync();

      const permissionStatus: PermissionStatus = {
        granted: status === "granted",
        required: true,
        status,
      };

      setPermissionStatus("mediaLibrary", permissionStatus);
      return permissionStatus;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to check permissions";
      setError(errorMessage);
      throw err;
    }
  }, [setPermissionStatus]);

  const requestPermission = useCallback(async (): Promise<PermissionResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();

      const permissionStatus: PermissionStatus = {
        granted: status === "granted",
        required: true,
        status,
      };

      setPermissionStatus("mediaLibrary", permissionStatus);

      const result: PermissionResult = {
        status,
        timestamp: Date.now(),
        required: true,
      };

      if (status === "denied") {
        result.error = "Permission denied";
        result.reason = "User denied media library access";
      } else if (status === "undetermined") {
        result.error = "Permission undetermined";
        result.reason = "User has not responded to permission request";
      }

      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to request permissions";
      setError(errorMessage);

      const result: PermissionResult = {
        status: "denied",
        timestamp: Date.now(),
        required: true,
        error: errorMessage,
      };

      return result;
    } finally {
      setIsLoading(false);
    }
  }, [setPermissionStatus]);

  // Check permission status on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return {
    permissionStatus: mediaLibraryStatus,
    isLoading,
    requestPermission,
    checkPermission,
    error,
  };
}