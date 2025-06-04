
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface FormSkeletonProps {
  fields?: number;
  showButton?: boolean;
}

const FormSkeleton: React.FC<FormSkeletonProps> = ({
  fields = 3,
  showButton = true
}) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      {showButton && (
        <div className="flex justify-end">
          <Skeleton className="h-10 w-24" />
        </div>
      )}
    </div>
  );
};

export default FormSkeleton;
