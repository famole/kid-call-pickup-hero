
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, User, Phone } from 'lucide-react';
import { PickupRequestWithDetails } from '@/types/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';

interface PendingPickupsTableProps {
  requests: PickupRequestWithDetails[];
  onMarkAsCalled: (requestId: string) => Promise<void>;
  loading: boolean;
}

const PendingPickupsTable: React.FC<PendingPickupsTableProps> = ({
  requests,
  onMarkAsCalled,
  loading
}) => {
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('pickup.pendingRequests', { count: 0 })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    const emptyStateContent = (
      <div className="text-center py-8">
        <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('pickup.noPickups')}</h3>
        <p className="text-gray-500">{t('dashboard.noRequests')}</p>
      </div>
    );

    if (isMobile) {
      return (
        <div className="w-full space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Clock className="h-5 w-5" />
            <h2 className="text-lg font-semibold">{t('pickup.pendingRequests', { count: 0 })}</h2>
          </div>
          {emptyStateContent}
        </div>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('pickup.pendingRequests', { count: 0 })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {emptyStateContent}
        </CardContent>
      </Card>
    );
  }

  if (!isMobile) {
    // Desktop layout with card container
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('pickup.pendingRequests', { count: requests.length })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">{t('pickup.studentName')}</TableHead>
                  <TableHead className="text-left">{t('admin.class')}</TableHead>
                  <TableHead className="text-left">{t('pickup.parentName')}</TableHead>
                  <TableHead className="text-left">{t('pickup.requestTime')}</TableHead>
                  <TableHead className="text-left">{t('pickup.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((item) => (
                  <TableRow key={item.request.id}>
                    <TableCell className="text-left">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={item.child?.avatar} alt={item.child?.name} />
                          <AvatarFallback className="bg-school-primary text-white">
                            {item.child?.name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-gray-900">
                            {item.child?.name || t('common.unknownChild')}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-left">
                      <div>
                        <div className="font-medium text-gray-900">
                          {item.class?.name || t('common.unknownClass')}
                        </div>
                        {item.class?.teacher && (
                          <div className="text-sm text-gray-500">
                            {item.class.teacher}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900">
                            {item.parent?.name || `${t('forms.parentName')} (ID: ${item.request.parentId?.slice(0, 8)}...)`}
                          </div>
                          {item.parent?.email && (
                            <div className="text-sm text-gray-500">
                              {item.parent.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <div>
                          <div>{new Date(item.request.requestTime).toLocaleTimeString()}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(item.request.requestTime).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-left">
                      <Button
                        onClick={() => onMarkAsCalled(item.request.id)}
                        size="sm"
                        className="bg-school-primary hover:bg-school-primary/90"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        {t('pickup.callForPickup')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mobile-optimized layout - no container card, compact design
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Clock className="h-5 w-5" />
        <h2 className="text-lg font-semibold">{t('pickup.pendingRequests', { count: requests.length })}</h2>
      </div>
      
      <div className="space-y-3">
        {requests.map((item) => (
          <div key={item.request.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar className="h-12 w-12 flex-shrink-0">
                  <AvatarImage src={item.child?.avatar} alt={item.child?.name} />
                  <AvatarFallback className="bg-school-primary text-white">
                    {item.child?.name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900 truncate">
                    {item.child?.name || t('common.unknownChild')}
                  </div>
                  <div className="text-sm text-gray-600 truncate">
                    {item.class?.name || t('common.unknownClass')}
                    {item.class?.grade && ` (${item.class.grade})`}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                    <User className="h-3 w-3" />
                    <span className="truncate">
                      {item.parent?.name || `${t('forms.parentName')} (ID: ${item.request.parentId?.slice(0, 8)}...)`}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => onMarkAsCalled(item.request.id)}
                size="sm"
                className="bg-school-primary hover:bg-school-primary/90 flex-shrink-0"
              >
                <Phone className="h-4 w-4 mr-1" />
                {t('pickup.callForPickup')}
              </Button>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-3 pt-2 border-t border-gray-100">
              <Clock className="h-3 w-3" />
              <span>
                {new Date(item.request.requestTime).toLocaleTimeString()} - {new Date(item.request.requestTime).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingPickupsTable;
