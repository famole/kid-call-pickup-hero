import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserCheck, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';

interface RecentPickup {
  id: string;
  studentName: string;
  parentName: string;
  completedTime: Date;
}

interface RecentPickupsNotificationProps {
  pickups: RecentPickup[];
  onDismiss: (id: string) => void;
}

const RecentPickupsNotification: React.FC<RecentPickupsNotificationProps> = ({
  pickups,
  onDismiss
}) => {
  const { t } = useTranslation();

  if (pickups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      {pickups.map((pickup) => (
        <Alert key={pickup.id} className="border-primary/20 bg-primary/5 py-2 flex items-center">
          <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
          <AlertDescription className="flex items-center justify-between gap-2 flex-1">
            <span className="text-xs">
              <strong>{pickup.studentName}</strong> {t('dashboard.pickedUpBy')} <strong>{pickup.parentName}</strong>
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 hover:bg-primary/10"
              onClick={() => onDismiss(pickup.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
};

export default RecentPickupsNotification;
