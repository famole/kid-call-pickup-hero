
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { PickupHistoryWithDetails } from '@/services/pickupHistoryService';

interface PickupHistoryTableProps {
  data: PickupHistoryWithDetails[];
}

const PickupHistoryTable: React.FC<PickupHistoryTableProps> = ({ data }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pickup History ({data.length} records)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student ID</TableHead>
                <TableHead>Parent ID</TableHead>
                <TableHead>Request Time</TableHead>
                <TableHead>Called Time</TableHead>
                <TableHead>Completed Time</TableHead>
                <TableHead>Duration (min)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-mono text-xs">
                    {record.studentId.slice(0, 8)}...
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {record.parentId.slice(0, 8)}...
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
                  <TableCell>
                    {record.pickupDurationMinutes ? 
                      Math.round(record.pickupDurationMinutes) : '-'
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default PickupHistoryTable;
