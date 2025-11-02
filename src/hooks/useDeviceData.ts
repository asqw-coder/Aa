import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface DeviceData {
  screen_width: number;
  screen_height: number;
  viewport_width: number;
  viewport_height: number;
  pixel_ratio: number;
  device_type: string;
  os: string;
  browser: string;
  browser_version: string;
  user_agent: string;
  touch_support: boolean;
  memory_gb?: number;
  cores?: number;
  color_depth?: number;
  connection_type?: string;
  timezone: string;
  language: string;
  orientation: string;
}

export const useDeviceData = () => {
  const { user } = useAuth();
  const [deviceData, setDeviceData] = useState<DeviceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getDeviceInfo = (): DeviceData => {
    const ua = navigator.userAgent;
    const screen = window.screen;
    
    // Detect device type
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isTablet = /iPad|Android(?=.*Tablet)|Windows NT.*Touch/i.test(ua);
    
    let deviceType = 'desktop';
    if (isTablet) deviceType = 'tablet';
    else if (isMobile) deviceType = 'mobile';

    // Detect OS
    let os = 'Unknown';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    // Detect browser
    let browser = 'Unknown';
    let browserVersion = '';
    if (ua.includes('Chrome')) {
      browser = 'Chrome';
      browserVersion = ua.match(/Chrome\/([0-9.]+)/)?.[1] || '';
    } else if (ua.includes('Firefox')) {
      browser = 'Firefox';
      browserVersion = ua.match(/Firefox\/([0-9.]+)/)?.[1] || '';
    } else if (ua.includes('Safari')) {
      browser = 'Safari';
      browserVersion = ua.match(/Version\/([0-9.]+)/)?.[1] || '';
    } else if (ua.includes('Edge')) {
      browser = 'Edge';
      browserVersion = ua.match(/Edge\/([0-9.]+)/)?.[1] || '';
    }

    // Get connection info if available
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    return {
      screen_width: screen.width,
      screen_height: screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      pixel_ratio: window.devicePixelRatio || 1,
      device_type: deviceType,
      os,
      browser,
      browser_version: browserVersion,
      user_agent: ua,
      touch_support: 'ontouchstart' in window,
      memory_gb: (navigator as any).deviceMemory,
      cores: navigator.hardwareConcurrency,
      color_depth: screen.colorDepth,
      connection_type: connection?.effectiveType,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      orientation: screen.orientation?.type || (window.innerHeight > window.innerWidth ? 'portrait-primary' : 'landscape-primary')
    };
  };

  const saveDeviceData = async (data: DeviceData) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('device_data')
        .upsert({
          user_id: user.id,
          ...data
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving device data:', error);
      }
    } catch (err) {
      console.error('Failed to save device data:', err);
    }
  };

  useEffect(() => {
    const collectAndSaveData = () => {
      const data = getDeviceInfo();
      setDeviceData(data);
      
      if (user) {
        saveDeviceData(data);
      }
      
      setIsLoading(false);
    };

    collectAndSaveData();

    // Update on resize or orientation change
    const handleResize = () => {
      const updatedData = getDeviceInfo();
      setDeviceData(updatedData);
      if (user) {
        saveDeviceData(updatedData);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [user]);

  return { deviceData, isLoading };
};