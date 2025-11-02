import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateDeviceFingerprint, getDeviceName } from '@/utils/deviceFingerprint';

export const useGlobalMetadata = () => {
  const metadataCollected = useRef(false);

  useEffect(() => {
    // Only collect metadata once per session
    if (metadataCollected.current) return;
    
    const collectMetadata = async () => {
      try {
        const visitorId = generateDeviceFingerprint();
        const deviceName = getDeviceName();

        // Get comprehensive device metadata
        const deviceData = {
          user_agent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform,
          screen_width: screen.width,
          screen_height: screen.height,
          viewport_width: window.innerWidth,
          viewport_height: window.innerHeight,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          color_depth: screen.colorDepth,
          pixel_ratio: window.devicePixelRatio,
          // @ts-ignore - may not be available in all browsers
          device_memory: (navigator as any).deviceMemory || null,
          hardware_concurrency: navigator.hardwareConcurrency || null,
          // @ts-ignore - may not be available in all browsers
          connection_type: (navigator as any).connection?.effectiveType || null,
          // @ts-ignore - may not be available in all browsers
          connection_downlink: (navigator as any).connection?.downlink || null,
          online: navigator.onLine,
          cookies_enabled: navigator.cookieEnabled,
          // @ts-ignore - may not be available in all browsers
          do_not_track: navigator.doNotTrack || (window as any).doNotTrack || null,
          touch_support: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
          max_touch_points: navigator.maxTouchPoints || 0,
          // @ts-ignore - vendor info
          vendor: navigator.vendor || null,
          languages: navigator.languages ? Array.from(navigator.languages) : [navigator.language],
          screen_orientation: screen.orientation?.type || null,
          available_screen_width: screen.availWidth,
          available_screen_height: screen.availHeight,
          timestamp: new Date().toISOString()
        };

        // Call public edge function to detect country and store metadata
        const { data, error } = await supabase.functions.invoke('detect-country', {
          body: { device_data: deviceData, visitor_id: visitorId, device_name: deviceName }
        });

        if (!error && data?.country_code) {
          localStorage.setItem('country_code', data.country_code);
          localStorage.setItem('visitor_id', visitorId);
          metadataCollected.current = true;
        }
      } catch (error) {
        console.error('Failed to collect metadata:', error);
      }
    };

    collectMetadata();
  }, []);
};