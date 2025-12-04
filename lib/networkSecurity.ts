/**
 * Network Security Configuration
 * Implements basic network security checks and HTTPS enforcement
 * 
 * SECURITY: Validates network connections and enforces secure communication
 * 
 * NOTE: Full certificate pinning requires bare workflow or native modules.
 * This implementation provides basic security checks for Expo managed workflow.
 */

import * as Network from 'expo-network';
import { Platform } from 'react-native';
import { logger } from './logger';

// Known secure endpoints for the app
const TRUSTED_HOSTS = [
  'supabase.co',
  'supabase.in',
  'api.openai.com',
  'api.anthropic.com',
  'api.resend.com',
];

// SSL Pinning hashes (SHA-256) - For future bare workflow implementation
// These hashes should be updated when certificates are rotated
const SSL_PINS: Record<string, string[]> = {
  'supabase.co': [
    // Primary certificate hash - UPDATE THESE WITH ACTUAL PINS
    'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    // Backup certificate hash
    'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
  ],
};

export interface NetworkSecurityResult {
  isSecure: boolean;
  isConnected: boolean;
  networkType: string;
  warnings: string[];
}

/**
 * Check if device is on a secure network
 */
export async function checkNetworkSecurity(): Promise<NetworkSecurityResult> {
  const warnings: string[] = [];
  
  try {
    const networkState = await Network.getNetworkStateAsync();
    
    // Check if connected
    if (!networkState.isConnected) {
      return { 
        isSecure: false, 
        isConnected: false,
        networkType: 'none',
        warnings: ['No network connection'] 
      };
    }
    
    let networkType = 'unknown';
    
    // Check network type
    if (networkState.type === Network.NetworkStateType.CELLULAR) {
      networkType = 'cellular';
      logger.info('Connected via cellular network');
    } else if (networkState.type === Network.NetworkStateType.WIFI) {
      networkType = 'wifi';
      // WiFi might be compromised - just a warning
      warnings.push('Connected via WiFi - ensure you trust this network');
    } else if (networkState.type === Network.NetworkStateType.VPN) {
      networkType = 'vpn';
      logger.info('Connected via VPN');
    }
    
    return { 
      isSecure: true, 
      isConnected: true,
      networkType,
      warnings 
    };
  } catch (error) {
    logger.error('Network security check failed:', error);
    return { 
      isSecure: false, 
      isConnected: false,
      networkType: 'unknown',
      warnings: ['Unable to verify network security'] 
    };
  }
}

/**
 * Validate URL against trusted hosts
 */
export function isTrustedHost(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return TRUSTED_HOSTS.some(host => urlObj.hostname.endsWith(host));
  } catch {
    return false;
  }
}

/**
 * Check if URL uses HTTPS
 */
export function isSecureUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Get SSL pins for a host (for future native implementation)
 */
export function getSSLPins(host: string): string[] | null {
  for (const [domain, pins] of Object.entries(SSL_PINS)) {
    if (host.endsWith(domain)) {
      return pins;
    }
  }
  return null;
}

/**
 * Validate a URL before making a request
 */
export function validateRequestUrl(url: string): { 
  isValid: boolean; 
  error?: string 
} {
  // Check if URL is valid
  try {
    new URL(url);
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
  
  // Enforce HTTPS
  if (!isSecureUrl(url)) {
    logger.warn('Attempted insecure HTTP request:', url);
    return { isValid: false, error: 'Only HTTPS connections are allowed' };
  }
  
  // Warn about untrusted hosts (but allow)
  if (!isTrustedHost(url)) {
    logger.warn('Request to untrusted host:', url);
  }
  
  return { isValid: true };
}

/**
 * Create fetch wrapper with security checks
 */
export function createSecureFetch() {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();
    
    // Validate URL
    const validation = validateRequestUrl(url);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    
    // Add security headers
    const secureInit: RequestInit = {
      ...init,
      headers: {
        ...init?.headers,
        'X-Requested-With': 'TourApp',
        // Prevent caching of sensitive data
        'Cache-Control': 'no-store',
      },
    };
    
    return fetch(input, secureInit);
  };
}

/**
 * Hook for network security status
 */
import { useState, useEffect } from 'react';

export function useNetworkSecurity() {
  const [securityStatus, setSecurityStatus] = useState<NetworkSecurityResult | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    async function check() {
      const result = await checkNetworkSecurity();
      if (isMounted) {
        setSecurityStatus(result);
        setIsChecking(false);
      }
    }
    
    check();
    
    // Re-check periodically
    const interval = setInterval(check, 30000); // Every 30 seconds
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return {
    ...securityStatus,
    isChecking,
    refresh: async () => {
      setIsChecking(true);
      const result = await checkNetworkSecurity();
      setSecurityStatus(result);
      setIsChecking(false);
    },
  };
}

/**
 * Check if the app should warn about network security
 */
export function shouldWarnAboutNetwork(result: NetworkSecurityResult): boolean {
  return !result.isSecure || result.warnings.length > 0;
}
