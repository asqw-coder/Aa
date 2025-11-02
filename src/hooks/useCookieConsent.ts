import { useState, useEffect } from 'react';

export interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

export interface CookieConsentState {
  hasConsent: boolean;
  preferences: CookiePreferences;
  showBanner: boolean;
}

const COOKIE_CONSENT_KEY = 'nova-cookie-consent';
const COOKIE_PREFERENCES_KEY = 'nova-cookie-preferences';

export const useCookieConsent = () => {
  const [consentState, setConsentState] = useState<CookieConsentState>({
    hasConsent: false,
    preferences: {
      necessary: true, // Always true, cannot be disabled
      analytics: false,
      marketing: false,
      functional: false,
    },
    showBanner: true,
  });

  // Load consent state from cookies on mount
  useEffect(() => {
    const savedConsent = getCookie(COOKIE_CONSENT_KEY);
    const savedPreferences = getCookie(COOKIE_PREFERENCES_KEY);

    if (savedConsent === 'true' && savedPreferences) {
      try {
        const preferences = JSON.parse(savedPreferences);
        setConsentState({
          hasConsent: true,
          preferences: {
            necessary: true, // Always true
            ...preferences,
          },
          showBanner: false,
        });
      } catch (error) {
        console.error('Error parsing cookie preferences:', error);
      }
    }
  }, []);

  const acceptAll = () => {
    const preferences: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true,
    };

    saveConsent(preferences);
  };

  const acceptNecessary = () => {
    const preferences: CookiePreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false,
    };

    saveConsent(preferences);
  };

  const saveCustomPreferences = (preferences: CookiePreferences) => {
    saveConsent(preferences);
  };

  const saveConsent = (preferences: CookiePreferences) => {
    // Save consent flag
    setCookie(COOKIE_CONSENT_KEY, 'true', 365);
    
    // Save preferences (excluding necessary as it's always true)
    const prefsToSave = {
      analytics: preferences.analytics,
      marketing: preferences.marketing,
      functional: preferences.functional,
    };
    setCookie(COOKIE_PREFERENCES_KEY, JSON.stringify(prefsToSave), 365);

    setConsentState({
      hasConsent: true,
      preferences: {
        necessary: true,
        ...prefsToSave,
      },
      showBanner: false,
    });
  };

  const revokeConsent = () => {
    deleteCookie(COOKIE_CONSENT_KEY);
    deleteCookie(COOKIE_PREFERENCES_KEY);
    
    // Clear all non-necessary cookies
    clearNonNecessaryCookies();

    setConsentState({
      hasConsent: false,
      preferences: {
        necessary: true,
        analytics: false,
        marketing: false,
        functional: false,
      },
      showBanner: true,
    });
  };

  return {
    ...consentState,
    acceptAll,
    acceptNecessary,
    saveCustomPreferences,
    revokeConsent,
  };
};

// Cookie utility functions
export const setCookie = (name: string, value: string, days: number = 365) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
};

export const getCookie = (name: string): string | null => {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  
  return null;
};

export const deleteCookie = (name: string) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

export const clearNonNecessaryCookies = () => {
  const cookies = document.cookie.split(';');
  const necessaryCookies = [COOKIE_CONSENT_KEY, COOKIE_PREFERENCES_KEY];
  
  cookies.forEach(cookie => {
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
    
    // Only delete non-necessary cookies
    if (!necessaryCookies.includes(name) && !name.startsWith('_') && name !== '') {
      deleteCookie(name);
    }
  });
};

// Helper functions for storing app data with consent
export const setAppCookie = (name: string, value: string, category: keyof CookiePreferences = 'functional') => {
  const consent = getCookie(COOKIE_CONSENT_KEY);
  const preferences = getCookie(COOKIE_PREFERENCES_KEY);
  
  if (consent === 'true' && preferences) {
    try {
      const prefs = JSON.parse(preferences);
      
      // Always allow necessary cookies
      if (category === 'necessary' || prefs[category] === true) {
        setCookie(name, value);
        return true;
      }
    } catch (error) {
      console.error('Error checking cookie preferences:', error);
    }
  }
  
  return false;
};

export const getAppCookie = (name: string): string | null => {
  return getCookie(name);
};