
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
      </CardContent>
    </Card>
  );
};

export default PickupHistoryTable;
