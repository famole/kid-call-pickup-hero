
import React from 'react';
import { useOptimizedPickupManagement } from '@/hooks/useOptimizedPickupManagement';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAllClasses } from '@/services/classService';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { User } from 'lucide-react';

interface OptimizedPendingPickupsTableProps {
  selectedClass?: string;
  onClassChange?: (classId: string) => void;
}

const OptimizedPendingPickupsTable: React.FC<OptimizedPendingPickupsTableProps> = ({
  selectedClass,
  onClassChange
}) => {
  const { pendingRequests, loading, markAsCalled } = useOptimizedPickupManagement(selectedClass);
  
  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => getAllClasses(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const handleCallStudent = async (requestId: string) => {
    try {
      await markAsCalled(requestId);
    } catch (error) {
      console.error('Error calling student:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Pickups</CardTitle>
          <CardDescription>Students waiting to be called</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Pending Pickups ({pendingRequests.length})</CardTitle>
            <CardDescription>Students waiting to be called</CardDescription>
          </div>
          
          {!classesLoading && (
            <Select value={selectedClass || 'all'} onValueChange={onClassChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} ({cls.grade})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {pendingRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No pending pickup requests
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Pickup Person</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Requested At</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingRequests.map((item) => (
                <TableRow key={item.request.id}>
                  <TableCell className="font-medium">
                    {item.child?.name || 'Unknown Student'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">
                        {item.parent?.name || `Parent (ID: ${item.request.parentId?.slice(0, 8)}...)`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.class?.name || 'Unknown Class'} {item.class?.grade && `(${item.class.grade})`}
                  </TableCell>
                  <TableCell>{item.class?.teacher || 'Unknown Teacher'}</TableCell>
                  <TableCell>
                    {new Date(item.request.requestTime).toLocaleTimeString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      onClick={() => handleCallStudent(item.request.id)}
                      className="bg-school-primary hover:bg-school-primary/90"
                    >
                      Call Student
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default OptimizedPendingPickupsTable;
