import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Check, Copy, QrCode, Key } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TwoFactorEnrollDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TwoFactorEnrollDialog = ({ isOpen, onClose, onSuccess }: TwoFactorEnrollDialogProps) => {
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  // Cleanup object URLs when component unmounts
  useEffect(() => {
    return () => {
      if (qrCode && qrCode.startsWith('blob:')) {
        URL.revokeObjectURL(qrCode);
      }
    };
  }, [qrCode]);

  const handleEnroll = async () => {
    setIsEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) throw error;

      if (data && data.totp) {
        const incomingQr = (data.totp as any).qr_code as string | undefined;
        const secretVal = (data.totp as any).secret as string | undefined;
        const uri = (data.totp as any).uri || (data.totp as any).otpauth_url;

        if (secretVal) setSecret(secretVal);

        let qrUrl: string | null = null;
        if (incomingQr) {
          if (incomingQr.startsWith('data:')) {
            qrUrl = incomingQr;
          } else if (incomingQr.startsWith('<svg')) {
            const blob = new Blob([incomingQr], { type: 'image/svg+xml' });
            qrUrl = URL.createObjectURL(blob);
          } else if (/^[A-Za-z0-9+/=]+$/.test(incomingQr)) {
            // looks like base64 without header; assume PNG
            qrUrl = `data:image/png;base64,${incomingQr}`;
          }
        }

        if (!qrUrl) {
          // Fallback: build otpauth URL and generate QR locally
          const { data: userData } = await supabase.auth.getUser();
          const email = userData.user?.email || 'user';
          const issuer = window.location.host || 'App';
          const secretForOtp = secretVal || '';
          if (uri) {
            qrUrl = await QRCode.toDataURL(uri);
          } else if (secretForOtp) {
            const otpauth = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secretForOtp}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
            qrUrl = await QRCode.toDataURL(otpauth);
          }
        }

        if (qrUrl) setQrCode(qrUrl);

        console.log('2FA Enrollment data:', {
          hasQrCode: !!incomingQr,
          hasSecret: !!secretVal,
          usedFallback: !incomingQr,
        });
      } else {
        throw new Error('No TOTP data returned from enroll');
      }
    } catch (error: any) {
      console.error('2FA enrollment error:', error);
      toast({
        title: 'Enrollment Failed',
        description: error?.message || 'Failed to start 2FA enrollment',
        variant: 'destructive',
      });
      // Keep dialog open to allow retry/manual entry
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter a 6-digit verification code',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    try {
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) throw factors.error;

      const totpFactor = factors.data.totp[0];
      if (!totpFactor) throw new Error('No TOTP factor found');

      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: totpFactor.id,
        code: verificationCode,
      });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: '2FA has been enabled on your account',
      });
      
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Verification Failed',
        description: error.message || 'Invalid verification code',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast({
      title: 'Copied!',
      description: 'Secret key copied to clipboard',
    });
  };

  const handleOpen = (open: boolean) => {
    if (open) {
      // Reset state and start enrollment
      if (qrCode && qrCode.startsWith('blob:')) {
        URL.revokeObjectURL(qrCode);
      }
      setQrCode('');
      setSecret('');
      setVerificationCode('');
      handleEnroll();
    } else {
      if (qrCode && qrCode.startsWith('blob:')) {
        URL.revokeObjectURL(qrCode);
      }
      setQrCode('');
      setSecret('');
      setVerificationCode('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
          <DialogDescription>
            Secure your account with an additional verification step
          </DialogDescription>
        </DialogHeader>

        {isEnrolling ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Setting up 2FA...</p>
          </div>
        ) : (
          <>
            <Tabs defaultValue="qr" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="qr">
                  <QrCode className="h-4 w-4 mr-2" />
                  QR Code
                </TabsTrigger>
                <TabsTrigger value="manual">
                  <Key className="h-4 w-4 mr-2" />
                  Manual Entry
                </TabsTrigger>
              </TabsList>

              <TabsContent value="qr" className="space-y-4">
                {qrCode ? (
                  <>
                    <div className="flex justify-center p-4 bg-white rounded-lg">
                      <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                    </p>
                  </>
                ) : (
                  <div className="flex justify-center py-8">
                    <p className="text-sm text-muted-foreground">Loading QR code...</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="manual" className="space-y-4">
                {secret ? (
                  <>
                    <div className="space-y-2">
                      <Label>Secret Key</Label>
                      <div className="flex gap-2">
                        <Input value={secret} readOnly className="font-mono text-sm" />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleCopySecret}
                        >
                          {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Enter this key manually in your authenticator app if you can't scan the QR code
                    </p>
                  </>
                ) : (
                  <div className="flex justify-center py-8">
                    <p className="text-sm text-muted-foreground">Loading secret key...</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {(qrCode || secret) && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verification-code">Verification Code</Label>
                  <Input
                    id="verification-code"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the code from your authenticator app to complete setup
                  </p>
                </div>

                <Button
                  onClick={handleVerify}
                  disabled={isVerifying || verificationCode.length !== 6}
                  className="w-full"
                >
                  {isVerifying ? 'Verifying...' : 'Verify & Enable 2FA'}
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
