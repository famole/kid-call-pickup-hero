
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, User, Phone } from 'lucide-react';
import { PickupRequestWithDetails } from '@/types/supabase';
import { Skeleton } from '@/components/ui/skeleton';

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
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Pickup Requests
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
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Pickup Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Requests</h3>
            <p className="text-gray-500">There are currently no students waiting to be called for pickup.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pending Pickup Requests ({requests.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">Student</TableHead>
                <TableHead className="text-left">Class</TableHead>
                <TableHead className="text-left">Pickup Person</TableHead>
                <TableHead className="text-left">Request Time</TableHead>
                <TableHead className="text-left">Action</TableHead>
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
                          {item.child?.name || 'Unknown Student'}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-left">
                    <div>
                      <div className="font-medium text-gray-900">
                        {item.class?.name || 'No Class'}
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
                          {item.parent?.name || `Parent (ID: ${item.request.parentId?.slice(0, 8)}...)`}
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
                      Call Student
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
};

export default PendingPickupsTable;
