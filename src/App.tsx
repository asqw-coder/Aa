import * as React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { TradingEngineProvider } from "@/contexts/TradingEngineContext";
import { ResponsiveLayout } from "@/components/ResponsiveLayout";
import { useAuth } from "@/hooks/useAuth";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { useGlobalMetadata } from "@/hooks/useGlobalMetadata";
import { ProfileCompletionDialog } from "@/components/ProfileCompletionDialog";
import { SystemBroadcastBanner } from "@/components/SystemBroadcastBanner";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import TradingConfiguration from "./pages/TradingConfiguration";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Trades from "./pages/Trades";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import Suspended from "./pages/Suspended";

const queryClient = new QueryClient();

function AppContent() {
  const { user, loading } = useAuth();
  const { 
    needsProfileCompletion, 
    currentProfile, 
    isLoading: profileLoading, 
    markProfileComplete 
  } = useProfileCompletion();
  
  // Collect device metadata on app load
  useGlobalMetadata();

  // Wrap everything in ResponsiveLayout for consistent device adaptation
  return (
    <ResponsiveLayout>
      {(loading || profileLoading) && (
        <div className="min-h-screen trust-gradient flex items-center justify-center">
          <div className="text-center">
            <img 
              src="/logo.jpg" 
              alt="Nova Trading Logo" 
              className="w-16 h-16 mx-auto mb-4 rounded-2xl object-cover shadow-lg animate-pulse"
            />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      )}

      {!loading && !profileLoading && !user && <Auth />}

      {!loading && !profileLoading && user && (
        (currentProfile as any)?.suspended ? (
          <Suspended />
        ) : (
          <>
            <SystemBroadcastBanner />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Index />} /> {/* Redirect to dashboard if already authenticated */}
              <Route path="/trades" element={<Trades />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/trading" element={<TradingConfiguration />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin" element={<Admin />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            {/* Profile Completion Dialog */}
            {needsProfileCompletion && currentProfile && (
              <ProfileCompletionDialog
                isOpen={needsProfileCompletion}
                onComplete={markProfileComplete}
                currentProfile={currentProfile}
              />
            )}
          </>
        )
      )}

    </ResponsiveLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
          <TradingEngineProvider>
            <TooltipProvider>
              <React.StrictMode>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <AppContent />
                </BrowserRouter>
              </React.StrictMode>
            </TooltipProvider>
          </TradingEngineProvider>
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
