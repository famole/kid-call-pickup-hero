
import React, { useState, useEffect } from 'react';
import { useOptimizedPickupManagement } from '@/hooks/useOptimizedPickupManagement';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAllClasses } from '@/services/classService';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Clock, Phone } from 'lucide-react';
import { Avatar as AvatarComponent, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface OptimizedPendingPickupsTableProps {
  selectedClass?: string;
  onClassChange?: (classId: string) => void;
}

const OptimizedPendingPickupsTable: React.FC<OptimizedPendingPickupsTableProps> = ({
  selectedClass,
  onClassChange
}) => {
  const { pendingRequests, loading, markAsCalled } = useOptimizedPickupManagement(selectedClass);
  const [isMobile, setIsMobile] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  });
  
  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => getAllClasses(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  if (!isMobile) {
    // Desktop layout with card container
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
  }

  // Mobile-optimized layout - no container card, compact design
  return (
    <div className="w-full space-y-3">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 px-1">
          <h2 className="text-lg font-semibold">Pending Pickups ({pendingRequests.length})</h2>
        </div>
        
        {!classesLoading && (
          <Select value={selectedClass || 'all'} onValueChange={onClassChange}>
            <SelectTrigger className="w-full">
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

      {pendingRequests.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No pending pickup requests
        </div>
      ) : (
        <div className="space-y-3">
          {pendingRequests.map((item) => (
            <div key={item.request.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <AvatarComponent className="h-12 w-12 flex-shrink-0">
                    <AvatarImage src={item.child?.avatar} alt={item.child?.name} />
                    <AvatarFallback className="bg-school-primary text-white">
                      {item.child?.name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </AvatarComponent>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900 truncate">
                      {item.child?.name || 'Unknown Student'}
                    </div>
                    <div className="text-sm text-gray-600 truncate">
                      {item.class?.name || 'Unknown Class'}
                      {item.class?.grade && ` (${item.class.grade})`}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <User className="h-3 w-3" />
                      <span className="truncate">
                        {item.parent?.name || `Parent (ID: ${item.request.parentId?.slice(0, 8)}...)`}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => handleCallStudent(item.request.id)}
                  size="sm"
                  className="bg-school-primary hover:bg-school-primary/90 flex-shrink-0"
                >
                  <Phone className="h-4 w-4 mr-1" />
                  Call
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
      )}
    </div>
  );
};

export default OptimizedPendingPickupsTable;
