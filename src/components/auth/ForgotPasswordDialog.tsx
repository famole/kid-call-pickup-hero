import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, Loader2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useNavigate } from 'react-router-dom';

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'email' | 'otp' | 'success';

export const ForgotPasswordDialog: React.FC<ForgotPasswordDialogProps> = ({ open, onOpenChange }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('email');
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error(t('auth.enterEmail'));
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.functions.invoke('send-password-reset', {
        body: { email },
      });

      if (error) throw error;

      setStep('otp');
      toast.success(t('auth.codeSentToEmail'));
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast.error(error.message || t('auth.failedToSendCode'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      toast.error(t('auth.enterSixDigitCode'));
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.rpc('verify_password_reset_otp', {
        p_email: email,
        p_otp_code: otp,
      });

      if (error) throw error;

      if (!data) {
        throw new Error(t('auth.invalidOrExpiredCode'));
      }

      // Navigate to password setup with verified email and OTP
      navigate(`/password-setup?email=${encodeURIComponent(email)}&otp=${otp}&reset=true`);
      handleClose();
      toast.success(t('auth.codeVerified'));
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast.error(error.message || t('auth.invalidOrExpiredCode'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setOtp('');
    setStep('email');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('auth.resetPassword')}</DialogTitle>
          <DialogDescription>
            {step === 'email' && t('auth.enterEmailForCode')}
            {step === 'otp' && t('auth.enterCodeSentToEmail')}
          </DialogDescription>
        </DialogHeader>
        
        {step === 'email' && (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">{t('auth.email')}</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder={t('auth.enterEmail')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="flex-1"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-school-primary hover:bg-school-primary/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('auth.sending')}
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    {t('auth.sendResetLink')}
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('auth.verificationCode')}</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {t('auth.enterCodeInstructions', { email })}
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('email')}
                disabled={loading}
                className="flex-1"
              >
                {t('common.back')}
              </Button>
              <Button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="flex-1 bg-school-primary hover:bg-school-primary/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('auth.verifying')}
                  </>
                ) : (
                  t('auth.verifyContinue')
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
