import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChevronLeft, ChevronRight, Clock, User, Calendar, PhoneCall, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { PickupHistoryWithDetails } from '@/services/pickupHistoryService';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  const [isMobile, setIsMobile] = useState(false);
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
    // Return original table for desktop
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            Pickup History ({data.length} records)
            {totalCount > data.length && ` of ${totalCount} total`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Student Name</th>
                    <th className="text-left p-3 font-medium">Parent Name</th>
                    <th className="text-left p-3 font-medium">Request Time</th>
                    <th className="text-left p-3 font-medium">Called Time</th>
                    <th className="text-left p-3 font-medium">Completed Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((record) => (
                    <tr key={record.id} className="border-b">
                      <td className="p-3">{record.studentName || 'Unknown Student'}</td>
                      <td className="p-3">{record.parentName || 'Unknown Parent'}</td>
                      <td className="p-3">{formatFullDate(record.requestTime)}</td>
                      <td className="p-3">
                        {record.calledTime ? formatFullDate(record.calledTime) : '-'}
                      </td>
                      <td className="p-3">{formatFullDate(record.completedTime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {showPagination && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages} ({totalCount} total records)
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    Next
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

  // Mobile-optimized card layout
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Pickup History ({data.length})
            {totalCount > data.length && (
              <span className="text-sm font-normal text-muted-foreground block">
                of {totalCount} total
              </span>
            )}
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="space-y-3">
        {data.map((record) => {
          const isExpanded = expandedItems.has(record.id);
          return (
            <Card key={record.id} className="overflow-hidden">
              <Collapsible>
                <CollapsibleTrigger 
                  className="w-full"
                  onClick={() => toggleExpanded(record.id)}
                >
                  <div className="p-4 space-y-3">
                    {/* Header with student info and expand button */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {(record.studentName || 'U').charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                          <div className="font-medium">
                            {record.studentName || 'Unknown Student'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {record.parentName || 'Unknown Parent'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          {formatTime(record.completedTime)}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Quick timeline indicators */}
                    <div className="flex items-center space-x-4 text-xs">
                      <div className="flex items-center space-x-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Requested</span>
                      </div>
                      {record.calledTime && (
                        <>
                          <div className="w-4 h-px bg-border"></div>
                          <div className="flex items-center space-x-1 text-muted-foreground">
                            <PhoneCall className="h-3 w-3" />
                            <span>Called</span>
                          </div>
                        </>
                      )}
                      <div className="w-4 h-px bg-border"></div>
                      <div className="flex items-center space-x-1 text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        <span>Completed</span>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-3 border-t bg-muted/20">
                    <div className="grid grid-cols-1 gap-3 pt-3">
                      {/* Request Time */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Request Time</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatFullDate(record.requestTime)}
                        </span>
                      </div>

                      {/* Called Time */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <PhoneCall className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Called Time</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {record.calledTime ? formatFullDate(record.calledTime) : 'Not called'}
                        </span>
                      </div>

                      {/* Completed Time */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">Completed Time</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatFullDate(record.completedTime)}
                        </span>
                      </div>

                      {/* Parent Info */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Parent</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {record.parentName || 'Unknown Parent'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {showPagination && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-4">
              <div className="text-center text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
                <br />
                {totalCount} total records
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
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="flex-1 max-w-32"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MobilePickupHistoryTable;