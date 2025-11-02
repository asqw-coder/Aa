/**
 * Generate a unique device fingerprint for trusted device tracking
 */
export const generateDeviceFingerprint = (): string => {
  const navigator = window.navigator;
  const screen = window.screen;
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    navigator.platform,
    navigator.hardwareConcurrency || 'unknown'
  ].join('|');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
};

export const getDeviceName = (): string => {
  const ua = navigator.userAgent;
  
  if (ua.includes('Windows')) return 'Windows PC';
  if (ua.includes('Mac')) return 'Mac';
  if (ua.includes('iPhone')) return 'iPhone';
  if (ua.includes('iPad')) return 'iPad';
  if (ua.includes('Android')) return 'Android Device';
  if (ua.includes('Linux')) return 'Linux PC';
  
  return 'Unknown Device';
};
