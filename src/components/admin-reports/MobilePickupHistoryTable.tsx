import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChevronLeft, ChevronRight, Clock, User, Calendar, PhoneCall, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { PickupHistoryWithDetails } from '@/services/pickupHistoryService';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTranslation } from '@/hooks/useTranslation';

interface MobilePickupHistoryTableProps {
  data: PickupHistoryWithDetails[];
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

const MobilePickupHistoryTable: React.FC<MobilePickupHistoryTableProps> = ({ 
  data, 
  totalCount = 0, 
  currentPage = 1, 
  pageSize = 500, 
  onPageChange 
}) => {
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  });
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const totalPages = Math.ceil(totalCount / pageSize);
  const showPagination = totalCount > pageSize && onPageChange;

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const formatTime = (date: Date | string) => {
    return format(new Date(date), 'MMM d, HH:mm');
  };

  const formatFullDate = (date: Date | string) => {
    return format(new Date(date), 'MMM d, yyyy HH:mm');
  };

  if (!isMobile) {
    // Desktop layout with card container
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {t('mobilePickupHistory.title')} ({data.length} {t('mobilePickupHistory.records')})
            {totalCount > data.length && ` ${t('mobilePickupHistory.of')} ${totalCount} ${t('mobilePickupHistory.total')}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-center p-3 font-medium">{t('mobilePickupHistory.studentName')}</th>
                    <th className="text-center p-3 font-medium">{t('mobilePickupHistory.parentName')}</th>
                    <th className="text-center p-3 font-medium">{t('mobilePickupHistory.requestTime')}</th>
                    <th className="text-center p-3 font-medium">{t('mobilePickupHistory.calledTime')}</th>
                    <th className="text-center p-3 font-medium">{t('mobilePickupHistory.type')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((record) => (
                    <tr key={record.id} className="border-b">
                      <td className="p-3 text-center">{record.studentName || t('mobilePickupHistory.unknownStudent')}</td>
                      <td className="p-3 text-center">{record.parentName || t('mobilePickupHistory.unknownParent')}</td>
                      <td className="p-3 text-center">{formatFullDate(record.requestTime)}</td>
                      <td className="p-3 text-center">
                        {record.calledTime ? formatFullDate(record.calledTime) : '-'}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={(record as any).type === 'self_checkout' ? 'secondary' : 'default'} className="whitespace-nowrap">
                          {(record as any).type === 'self_checkout' ? t('mobilePickupHistory.selfCheckoutFull') : t('mobilePickupHistory.pickup')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {showPagination && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {t('mobilePickupHistory.page')} {currentPage} {t('mobilePickupHistory.of')} {totalPages} ({totalCount} {t('mobilePickupHistory.totalRecords')})
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {t('mobilePickupHistory.previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    {t('mobilePickupHistory.next')}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mobile-optimized table layout - no container card, compact design
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="px-2">
        <h3 className="text-lg font-semibold">
          {t('mobilePickupHistory.title')} ({data.length})
          {totalCount > data.length && (
            <span className="text-sm font-normal text-muted-foreground block">
              {t('mobilePickupHistory.of')} {totalCount} {t('mobilePickupHistory.total')}
            </span>
          )}
        </h3>
      </div>

      {/* Compact table for mobile - no badges, minimal styling */}
      <div className="overflow-x-auto -mx-2">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-center p-2 font-medium text-xs">{t('mobilePickupHistory.student')}</th>
              <th className="text-center p-2 font-medium text-xs">{t('mobilePickupHistory.parent')}</th>
              <th className="text-center p-2 font-medium text-xs">{t('mobilePickupHistory.requested')}</th>
              <th className="text-center p-2 font-medium text-xs">{t('mobilePickupHistory.called')}</th>
              <th className="text-center p-2 font-medium text-xs">{t('mobilePickupHistory.type')}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((record) => (
              <tr key={record.id} className="border-b hover:bg-muted/30">
                <td className="p-2 text-xs text-center">{record.studentName || t('mobilePickupHistory.unknown')}</td>
                <td className="p-2 text-xs text-muted-foreground text-center">{record.parentName || t('mobilePickupHistory.unknown')}</td>
                <td className="p-2 text-xs text-center">{formatTime(record.requestTime)}</td>
                <td className="p-2 text-xs text-center">
                  {record.calledTime ? formatTime(record.calledTime) : '-'}
                </td>
                <td className="p-2 text-xs text-center">
                  <Badge variant={(record as any).type === 'self_checkout' ? 'secondary' : 'default'} className="text-[10px] px-1 py-0.5">
                    {(record as any).type === 'self_checkout' ? t('mobilePickupHistory.selfCheckoutShort') : t('mobilePickupHistory.pickup')}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <div className="px-2">
          <div className="flex flex-col space-y-3">
            <div className="text-center text-sm text-muted-foreground">
              {t('mobilePickupHistory.page')} {currentPage} {t('mobilePickupHistory.of')} {totalPages} • {totalCount} {t('mobilePickupHistory.totalRecords')}
            </div>
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="flex-1 max-w-32"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {t('mobilePickupHistory.previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="flex-1 max-w-32"
              >
                {t('mobilePickupHistory.next')}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobilePickupHistoryTable;