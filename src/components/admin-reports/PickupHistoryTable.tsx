
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { PickupHistoryWithDetails } from '@/services/pickupHistoryService';

interface PickupHistoryTableProps {
  data: PickupHistoryWithDetails[];
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

const PickupHistoryTable: React.FC<PickupHistoryTableProps> = ({ 
  data, 
  totalCount = 0, 
  currentPage = 1, 
  pageSize = 500, 
  onPageChange 
}) => {
  const totalPages = Math.ceil(totalCount / pageSize);
  const showPagination = totalCount > pageSize && onPageChange;
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Parent Name</TableHead>
                  <TableHead>Request Time</TableHead>
                  <TableHead>Called Time</TableHead>
                  <TableHead>Completed Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {record.studentName || 'Unknown Student'}
                    </TableCell>
                    <TableCell>
                      {record.parentName || 'Unknown Parent'}
                    </TableCell>
                    <TableCell>
                      {format(record.requestTime, 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      {record.calledTime 
                        ? format(record.calledTime, 'MMM d, yyyy HH:mm')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {format(record.completedTime, 'MMM d, yyyy HH:mm')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
};

export default PickupHistoryTable;
