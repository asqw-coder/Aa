import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield } from 'lucide-react';

interface TwoFactorVerifyDialogProps {
  isOpen: boolean;
  onVerify: (code: string, trustDevice: boolean) => Promise<void>;
  onCancel: () => void;
  isVerifying: boolean;
}

export const TwoFactorVerifyDialog = ({ 
  isOpen, 
  onVerify, 
  onCancel, 
  isVerifying 
}: TwoFactorVerifyDialogProps) => {
  const [code, setCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onVerify(code, trustDevice);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center">Two-Factor Authentication</DialogTitle>
          <DialogDescription className="text-center">
            Enter the 6-digit code from your authenticator app
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="2fa-code" className="sr-only">Verification Code</Label>
            <Input
              id="2fa-code"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="text-center text-2xl tracking-widest font-mono"
              autoFocus
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="trust-device"
              checked={trustDevice}
              onCheckedChange={(checked) => setTrustDevice(checked as boolean)}
            />
            <label
              htmlFor="trust-device"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Trust this device for 30 days
            </label>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isVerifying}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isVerifying || code.length !== 6}
              className="flex-1"
            >
              {isVerifying ? 'Verifying...' : 'Verify'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
