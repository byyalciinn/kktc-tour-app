/**
 * Device Security Check
 * Detects potentially compromised devices (jailbreak/root, emulator, debugger)
 * 
 * SECURITY: Warns users about potentially insecure device configurations
 * 
 * NOTE: Full jailbreak/root detection requires native modules (e.g., jail-monkey).
 * This implementation provides basic checks available in Expo managed workflow.
 */

import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { logger } from './logger';

export interface SecurityCheckResult {
  isSecure: boolean;
  warnings: string[];
  details: {
    isEmulator: boolean;
    isRooted: boolean | null; // null = unable to detect
    debuggerAttached: boolean | null;
    isTestFlight: boolean | null;
    deviceType: string;
    osVersion: string;
  };
}

/**
 * Check if running on emulator/simulator
 */
async function checkEmulator(): Promise<boolean> {
  return !Device.isDevice;
}

/**
 * Get device type string
 */
function getDeviceType(): string {
  switch (Device.deviceType) {
    case Device.DeviceType.PHONE:
      return 'phone';
    case Device.DeviceType.TABLET:
      return 'tablet';
    case Device.DeviceType.DESKTOP:
      return 'desktop';
    case Device.DeviceType.TV:
      return 'tv';
    default:
      return 'unknown';
  }
}

/**
 * Basic root/jailbreak detection
 * Note: This is a basic check, not foolproof
 * For production apps, consider using native modules like jail-monkey
 */
async function checkRootBasic(): Promise<boolean | null> {
  // In Expo managed workflow, we can't do deep root detection
  // Return null to indicate we can't determine
  return null;
}

/**
 * Check if debugger is attached (basic)
 */
function checkDebugger(): boolean | null {
  // __DEV__ is a basic indicator
  if (__DEV__) {
    return true;
  }
  return null;
}

/**
 * Check if app is from TestFlight (iOS)
 * Note: Accurate detection requires native code
 */
async function checkTestFlight(): Promise<boolean | null> {
  if (Platform.OS !== 'ios') return null;
  
  // In Expo managed workflow, we can't accurately detect TestFlight
  // This would require checking the receipt file with native code
  return null;
}

/**
 * Perform all security checks
 */
export async function checkDeviceSecurity(): Promise<SecurityCheckResult> {
  const warnings: string[] = [];
  
  const isEmulator = await checkEmulator();
  const isRooted = await checkRootBasic();
  const debuggerAttached = checkDebugger();
  const isTestFlight = await checkTestFlight();
  const deviceType = getDeviceType();
  const osVersion = Device.osVersion || 'unknown';
  
  // Build warnings
  if (isEmulator) {
    warnings.push('Uygulama bir emülatörde çalışıyor');
  }
  
  if (isRooted === true) {
    warnings.push('Cihaz root/jailbreak edilmiş olabilir');
  }
  
  if (debuggerAttached === true && !__DEV__) {
    warnings.push('Debugger bağlı olabilir');
  }
  
  // Determine if secure
  // In production, you might want stricter checks
  const isSecure = !isRooted && (!isEmulator || __DEV__);
  
  const result: SecurityCheckResult = {
    isSecure,
    warnings,
    details: {
      isEmulator,
      isRooted,
      debuggerAttached,
      isTestFlight,
      deviceType,
      osVersion,
    },
  };
  
  logger.info('Device security check:', result);
  
  return result;
}

/**
 * Check if device meets minimum security requirements
 */
export async function meetsSecurityRequirements(): Promise<{
  meets: boolean;
  reason?: string;
}> {
  const result = await checkDeviceSecurity();
  
  // In production mode, block rooted devices
  if (!__DEV__ && result.details.isRooted === true) {
    return {
      meets: false,
      reason: 'Bu uygulama root/jailbreak edilmiş cihazlarda çalışmaz',
    };
  }
  
  // In production mode, warn about emulators
  if (!__DEV__ && result.details.isEmulator) {
    return {
      meets: false,
      reason: 'Bu uygulama emülatörlerde çalışmaz',
    };
  }
  
  return { meets: true };
}

/**
 * Get device info for logging/analytics
 */
export function getDeviceInfo(): {
  brand: string | null;
  model: string | null;
  osName: string | null;
  osVersion: string | null;
  deviceType: string;
} {
  return {
    brand: Device.brand,
    model: Device.modelName,
    osName: Device.osName,
    osVersion: Device.osVersion,
    deviceType: getDeviceType(),
  };
}
