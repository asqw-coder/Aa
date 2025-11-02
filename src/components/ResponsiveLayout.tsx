import React, { useEffect } from 'react';
import { useDeviceData } from '@/hooks/useDeviceData';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ children }) => {
  const { deviceData } = useDeviceData();

  useEffect(() => {
    if (!deviceData) return;

    const root = document.documentElement;
    
    // Set CSS custom properties for optional use
    root.style.setProperty('--device-width', `${deviceData.viewport_width}px`);
    root.style.setProperty('--device-height', `${deviceData.viewport_height}px`);
    root.style.setProperty('--pixel-ratio', deviceData.pixel_ratio.toString());
    
    // Apply minimal device-specific classes for debugging/styling purposes only
    const body = document.body;
    
    // Clear existing device classes
    body.classList.remove('device-mobile', 'device-tablet', 'device-desktop');
    
    // Add device type class (non-intrusive, for CSS hooks only)
    body.classList.add(`device-${deviceData.device_type}`);
    
  }, [deviceData]);

  // No dynamic classes - let components handle their own responsive design
  return <>{children}</>;
};