
import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingIndicatorProps {
  message?: string;
  showSpinner?: boolean;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  message = "Loading...",
  showSpinner = true
}) => {
  return (
    <div className="flex items-center justify-center py-8 space-x-2">
      {showSpinner && <Loader2 className="h-5 w-5 animate-spin" />}
      <span className="text-muted-foreground">{message}</span>
    </div>
  );
};

export default LoadingIndicator;
