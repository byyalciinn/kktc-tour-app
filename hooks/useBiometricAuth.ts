/**
 * Biometric Authentication Hook
 * React hook for biometric authentication
 * 
 * SECURITY: Provides easy access to biometric auth in components
 */

import { useState, useEffect, useCallback } from 'react';
import {
  checkBiometricCapabilities,
  authenticateWithBiometrics,
  isBiometricEnabled,
  setBiometricEnabled,
  BiometricCapabilities,
  BiometricAuthResult,
  getBiometricTypeName,
  needsReauthentication,
} from '@/lib/biometricAuth';

export function useBiometricAuth() {
  const [capabilities, setCapabilities] = useState<BiometricCapabilities | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial state
  useEffect(() => {
    async function load() {
      const [caps, enabled] = await Promise.all([
        checkBiometricCapabilities(),
        isBiometricEnabled(),
      ]);
      setCapabilities(caps);
      setIsEnabled(enabled);
      setIsLoading(false);
    }
    load();
  }, []);

  // Toggle biometric authentication
  const toggleBiometric = useCallback(async (enabled: boolean): Promise<boolean> => {
    if (enabled) {
      // Require biometric verification to enable
      const result = await authenticateWithBiometrics({
        promptMessage: 'Biyometrik doğrulamayı etkinleştirmek için doğrulayın',
      });
      
      if (!result.success) {
        return false;
      }
    }
    
    await setBiometricEnabled(enabled);
    setIsEnabled(enabled);
    return true;
  }, []);

  // Authenticate
  const authenticate = useCallback(async (
    promptMessage?: string
  ): Promise<BiometricAuthResult> => {
    return authenticateWithBiometrics({ promptMessage });
  }, []);

  // Check if re-auth is needed
  const checkReauthNeeded = useCallback(async (maxAgeMins?: number): Promise<boolean> => {
    return needsReauthentication(maxAgeMins);
  }, []);

  // Get biometric type name
  const biometricName = capabilities 
    ? getBiometricTypeName(capabilities.biometricTypes)
    : '';

  return {
    capabilities,
    isEnabled,
    isLoading,
    isAvailable: capabilities?.isAvailable && capabilities?.hasEnrolledBiometrics,
    biometricName,
    toggleBiometric,
    authenticate,
    checkReauthNeeded,
  };
}

export default useBiometricAuth;
