
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface CardSkeletonProps {
  showHeader?: boolean;
  headerHeight?: string;
  contentHeight?: string;
  className?: string;
}

const CardSkeleton: React.FC<CardSkeletonProps> = ({
  showHeader = true,
  headerHeight = "h-16",
  contentHeight = "h-32",
  className = ""
}) => {
  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <Skeleton className={`w-3/4 ${headerHeight}`} />
          <Skeleton className="w-1/2 h-4" />
        </CardHeader>
      )}
      <CardContent>
        <Skeleton className={`w-full ${contentHeight}`} />
      </CardContent>
    </Card>
  );
};

export default CardSkeleton;
