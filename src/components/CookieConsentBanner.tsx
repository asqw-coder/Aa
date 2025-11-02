import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Cookie, Settings, Shield, BarChart3, Target, Zap } from 'lucide-react';
import { useCookieConsent, CookiePreferences } from '@/hooks/useCookieConsent';

export const CookieConsentBanner: React.FC = () => {
  const { 
    showBanner, 
    preferences, 
    acceptAll, 
    acceptNecessary, 
    saveCustomPreferences 
  } = useCookieConsent();
  
  const [showSettings, setShowSettings] = useState(false);
  const [tempPreferences, setTempPreferences] = useState<CookiePreferences>(preferences);

  if (!showBanner) return null;

  const handleSaveCustom = () => {
    saveCustomPreferences(tempPreferences);
    setShowSettings(false);
  };

  const cookieCategories = [
    {
      key: 'necessary' as keyof CookiePreferences,
      title: 'Necessary Cookies',
      description: 'Essential for the website to function properly. These cannot be disabled.',
      icon: Shield,
      required: true,
    },
    {
      key: 'functional' as keyof CookiePreferences,
      title: 'Functional Cookies',
      description: 'Enhance your experience by remembering your preferences and settings.',
      icon: Zap,
      required: false,
    },
    {
      key: 'analytics' as keyof CookiePreferences,
      title: 'Analytics Cookies',
      description: 'Help us understand how you use our website to improve performance.',
      icon: BarChart3,
      required: false,
    },
    {
      key: 'marketing' as keyof CookiePreferences,
      title: 'Marketing Cookies',
      description: 'Used to show you relevant content and advertisements.',
      icon: Target,
      required: false,
    },
  ];

  return (
    <>
      {/* Main Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
        <Card className="mx-auto max-w-4xl trust-card">
          <div className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <Cookie className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">
                    We value your privacy
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-2xl">
                    We use cookies to enhance your browsing experience, provide personalized content, 
                    and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 min-w-fit">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(true)}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Customize
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={acceptNecessary}
                >
                  Essential Only
                </Button>
                <Button
                  size="sm"
                  onClick={acceptAll}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Accept All
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5 text-primary" />
              Cookie Preferences
            </DialogTitle>
            <DialogDescription>
              Choose which cookies you want to accept. You can change these settings at any time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {cookieCategories.map((category, index) => {
              const Icon = category.icon;
              return (
                <div key={category.key}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <Icon className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-foreground">
                            {category.title}
                          </h4>
                          {category.required && (
                            <Badge variant="secondary" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {category.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={category.key}
                        checked={tempPreferences[category.key]}
                        onCheckedChange={(checked) => {
                          if (!category.required) {
                            setTempPreferences(prev => ({
                              ...prev,
                              [category.key]: checked
                            }));
                          }
                        }}
                        disabled={category.required}
                      />
                      <Label htmlFor={category.key} className="sr-only">
                        {category.title}
                      </Label>
                    </div>
                  </div>
                  
                  {index < cookieCategories.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSettings(false)}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setTempPreferences({
                  necessary: true,
                  analytics: false,
                  marketing: false,
                  functional: false,
                });
                handleSaveCustom();
              }}
            >
              Essential Only
            </Button>
            <Button onClick={handleSaveCustom}>
              Save Preferences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};