import React from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const Suspended: React.FC = () => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Force a reload to clear any in-memory state
    window.location.href = '/auth';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <main className="w-full max-w-md p-8 text-center">
        <img
          src="/logo.png"
          alt="Nova Trading Logo - Account Suspended"
          className="w-16 h-16 mx-auto mb-6 rounded-2xl object-cover shadow"
          loading="eager"
        />
        <h1 className="text-2xl font-bold tracking-tight mb-3">Account Suspended</h1>
        <p className="text-muted-foreground mb-8">
          Your account has been suspended. If you think this is a mistake, please contact support.
        </p>
        <Button size="lg" onClick={handleLogout}>
          Log out
        </Button>
      </main>
    </div>
  );
};

export default Suspended;
