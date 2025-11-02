import { useState, useEffect, useCallback } from 'react';

export interface SettingsState {
  darkMode: boolean;
  soundEnabled: boolean;
  emailAlerts: boolean;
  pushNotifications: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

const DEFAULT_SETTINGS: SettingsState = {
  darkMode: false,
  soundEnabled: true,
  emailAlerts: false,
  pushNotifications: true,
  fontSize: 'medium',
};

const STORAGE_KEY = 'nova-trading-settings';

export const useSettings = () => {
  const [settings, setSettings] = useState<SettingsState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error);
    }
    return DEFAULT_SETTINGS;
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
    }
  }, [settings]);

  // Apply dark mode to DOM
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  // Apply font size to DOM
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('text-sm', 'text-base', 'text-lg');
    
    switch (settings.fontSize) {
      case 'small':
        root.classList.add('text-sm');
        break;
      case 'large':
        root.classList.add('text-lg');
        break;
      default:
        root.classList.add('text-base');
    }
  }, [settings.fontSize]);

  // Request notification permission when push notifications are enabled
  useEffect(() => {
    if (settings.pushNotifications && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [settings.pushNotifications]);

  const updateSetting = useCallback(<K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const playNotificationSound = useCallback(() => {
    if (settings.soundEnabled) {
      // Create a simple notification sound using Web Audio API
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (error) {
        console.warn('Could not play notification sound:', error);
      }
    }
  }, [settings.soundEnabled]);

  const sendPushNotification = useCallback((title: string, message: string) => {
    if (settings.pushNotifications && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
      });
    }
  }, [settings.pushNotifications]);

  const sendEmailAlert = useCallback((title: string, message: string) => {
    if (settings.emailAlerts) {
      // In a real app, this would trigger an API call to send an email
      // For now, we'll just log it
      console.log('Email alert would be sent:', { title, message });
    }
  }, [settings.emailAlerts]);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    updateSetting,
    playNotificationSound,
    sendPushNotification,
    sendEmailAlert,
    resetSettings,
  };
};