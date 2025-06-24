
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Phone, User } from 'lucide-react';
import { PickupRequestWithDetails } from '@/types/supabase';

interface PendingPickupsTableProps {
  requests: PickupRequestWithDetails[];
  onMarkAsCalled: (requestId: string) => Promise<void>;
  loading?: boolean;
}

const PendingPickupsTable: React.FC<PendingPickupsTableProps> = ({ 
  requests, 
  onMarkAsCalled,
  loading = false 
}) => {
  const [callingRequest, setCallingRequest] = React.useState<string | null>(null);

  const handleMarkAsCalled = async (requestId: string) => {
    setCallingRequest(requestId);
    try {
      await onMarkAsCalled(requestId);
    } catch (error) {
      console.error('Error calling student:', error);
    } finally {
      setCallingRequest(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-school-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading pending pickups...</p>
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
            Pending Pickups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No pending pickup requests</p>
            <p className="text-sm mt-1">Students will appear here when parents request pickup</p>
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
          Pending Pickups ({requests.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              <TableHead>Pickup Person</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead>Requested At</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((item) => (
              <TableRow key={item.request.id}>
                <TableCell className="font-medium">
                  {item.child?.name || 'Unknown Student'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">
                      Parent (ID: {item.request.parentId?.slice(0, 8)}...)
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {item.class ? `${item.class.name} (${item.class.grade})` : 'Unknown Class'}
                </TableCell>
                <TableCell>
                  {item.class?.teacher || 'Unknown Teacher'}
                </TableCell>
                <TableCell>
                  {new Date(item.request.requestTime).toLocaleTimeString()}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    onClick={() => handleMarkAsCalled(item.request.id)}
                    disabled={callingRequest === item.request.id}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    {callingRequest === item.request.id ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-white mr-1"></div>
                        Calling...
                      </>
                    ) : (
                      <>
                        <Phone className="h-3 w-3 mr-1" />
                        Call Student
                      </>
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PendingPickupsTable;
