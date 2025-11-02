import React, { createContext, useContext, ReactNode } from 'react';
import { useSettings, SettingsState } from '@/hooks/useSettings';

interface SettingsContextValue {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  playNotificationSound: () => void;
  sendPushNotification: (title: string, message: string) => void;
  sendEmailAlert: (title: string, message: string) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export const useSettingsContext = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettingsContext must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const settingsHook = useSettings();

  return (
    <SettingsContext.Provider value={settingsHook}>
      {children}
    </SettingsContext.Provider>
  );
};