
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updatePickupRequestStatus } from '@/services/pickupService';
import { getStudentById } from '@/services/studentService';
import { getClassById } from '@/services/classService';
import { Child, Class, PickupRequest, User } from '@/types';

interface PickupRequestItemProps {
  request: PickupRequest;
  parentsCache: Record<string, User>;
}

const PickupRequestItem: React.FC<PickupRequestItemProps> = ({ request, parentsCache }) => {
  const [child, setChild] = useState<Child | null>(null);
  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [parent, setParent] = useState<User | null>(parentsCache[request.parentId] || null);
  const { toast } = useToast();
  
  useEffect(() => {
    const loadData = async () => {
      try {
        const childData = await getStudentById(request.studentId);
        setChild(childData);
        
        if (childData?.classId) {
          try {
            const classData = await getClassById(childData.classId);
            setClassInfo(classData);
          } catch (error) {
            console.error(`Error fetching class for child ${request.studentId}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error fetching details for request ${request.id}:`, error);
      }
    };
    
    loadData();
  }, [request.studentId, request.id]);

  const handleCallStudent = async () => {
    try {
      const updated = await updatePickupRequestStatus(request.id, 'called');
      if (updated) {
        toast({
          title: 'Student Called',
          description: 'The student has been called for pickup.',
        });
      }
    } catch (error) {
      console.error('Error calling student:', error);
      toast({
        title: 'Error',
        description: 'Failed to call student.',
        variant: 'destructive',
      });
    }
  };

  const handleMarkCompleted = async () => {
    try {
      const updated = await updatePickupRequestStatus(request.id, 'completed');
      if (updated) {
        toast({
          title: 'Pickup Completed',
          description: 'The student pickup has been marked as completed.',
        });
      }
    } catch (error) {
      console.error('Error completing pickup:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark pickup as completed.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div 
      className={`p-4 border rounded-lg flex items-center gap-4 ${
        request.status === 'called' 
          ? 'bg-green-50 border-green-200'
          : 'bg-blue-50 border-blue-200'
      }`}
    >
      <div>
        <h3 className="font-semibold text-lg">{child?.name || 'Loading...'}</h3>
        <p className="text-sm text-muted-foreground">
          Class: {classInfo?.name || 'Loading...'} • 
          Requested by: {parent?.name || 'Unknown Parent'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Requested at: {new Date(request.requestTime).toLocaleTimeString()}
        </p>
      </div>
      <div className="ml-auto flex gap-2">
        {request.status === 'pending' ? (
          <Button 
            variant="outline" 
            className="border-school-primary text-school-primary hover:bg-school-primary/10"
            onClick={handleCallStudent}
          >
            Call Student
          </Button>
        ) : (
          <Button 
            variant="outline" 
            className="border-school-secondary text-school-secondary hover:bg-school-secondary/10"
            onClick={handleMarkCompleted}
          >
            <Check className="mr-1 h-4 w-4" /> Mark Completed
          </Button>
        )}
      </div>
    </div>
  );
};

export default PickupRequestItem;
