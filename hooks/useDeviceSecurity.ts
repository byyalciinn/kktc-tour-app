/**
 * Device Security Hook
 * React hook for device security checks
 * 
 * SECURITY: Provides easy access to device security status in components
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  checkDeviceSecurity, 
  SecurityCheckResult,
  meetsSecurityRequirements,
  getDeviceInfo,
} from '@/lib/deviceSecurity';

export function useDeviceSecurity() {
  const [securityResult, setSecurityResult] = useState<SecurityCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    checkDeviceSecurity()
      .then((result) => {
        if (isMounted) {
          setSecurityResult(result);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsChecking(false);
        }
      });
    
    return () => {
      isMounted = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setIsChecking(true);
    const result = await checkDeviceSecurity();
    setSecurityResult(result);
    setIsChecking(false);
    return result;
  }, []);

  const checkRequirements = useCallback(async () => {
    return meetsSecurityRequirements();
  }, []);

  return {
    isSecure: securityResult?.isSecure ?? true,
    warnings: securityResult?.warnings ?? [],
    details: securityResult?.details ?? null,
    isChecking,
    refresh,
    checkRequirements,
    deviceInfo: getDeviceInfo(),
  };
}

export default useDeviceSecurity;
