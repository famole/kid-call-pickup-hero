import React from 'react';
import { Shield, ShieldCheck, ShieldX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { isEncryptionSupported } from '@/services/encryption';

interface EncryptionStatusProps {
  className?: string;
}

export const EncryptionStatus: React.FC<EncryptionStatusProps> = ({ className }) => {
  const isSupported = isEncryptionSupported();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={isSupported ? "default" : "destructive"} 
            className={`gap-1 ${className}`}
          >
            {isSupported ? (
              <>
                <ShieldCheck className="h-3 w-3" />
                Encrypted
              </>
            ) : (
              <>
                <ShieldX className="h-3 w-3" />
                Unencrypted
              </>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isSupported 
              ? "Data transfers are encrypted with AES-256-GCM" 
              : "Encryption not supported in this browser"
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};