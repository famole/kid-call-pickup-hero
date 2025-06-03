import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createPickupRequest, getActivePickupRequestsForParent } from '@/services/pickupService';
import { getStudentsForParent } from '@/services/studentService';
import { checkPickupAuthorization } from '@/services/pickupAuthorizationService';
import { supabase } from '@/integrations/supabase/client';
import { Child, PickupRequest } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import ParentDashboardHeader from './parent-dashboard/ParentDashboardHeader';
import ChildrenSelectionCard from './parent-dashboard/ChildrenSelectionCard';
import PickupStatusSidebar from './parent-dashboard/PickupStatusSidebar';

interface ChildWithType extends Child {
  isAuthorized?: boolean;
}

// Function to check if a string is a valid UUID
const isValidUUID = (id: string): boolean => {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

const ParentDashboard = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<ChildWithType[]>([]);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [activeRequests, setActiveRequests] = useState<PickupRequest[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      if (user) {
        try {
          setLoading(true);
          // Get children for this parent from the database
          const parentChildren = await getStudentsForParent(user.id);
          
          // Get all students from the database to check for authorized children
          const { data: allStudents, error } = await supabase
            .from('students')
            .select('*');
          
          if (error) {
            console.error('Error fetching all students:', error);
          }
          
          const authorizedChildren: ChildWithType[] = [];
          
          if (allStudents) {
            // Check each student to see if this parent is authorized to pick them up
            for (const student of allStudents) {
              // Skip if this is already the parent's own child
              if (parentChildren.some(child => child.id === student.id)) {
                continue;
              }
              
              const isAuthorized = await checkPickupAuthorization(user.id, student.id);
              if (isAuthorized) {
                authorizedChildren.push({
                  id: student.id,
                  name: student.name,
                  classId: student.class_id || '',
                  parentIds: [], // This will be empty for authorized children
                  avatar: student.avatar,
                  isAuthorized: true
                });
              }
            }
          }
          
          // Mark parent's own children
          const ownChildren: ChildWithType[] = parentChildren.map(child => ({
            ...child,
            isAuthorized: false
          }));
          
          // Combine own children and authorized children
          const allChildren = [...ownChildren, ...authorizedChildren];
          setChildren(allChildren);

          // Get active requests for this parent
          const parentActiveRequests = await getActivePickupRequestsForParent(user.id);
          
          // Get ALL called requests and filter for children this parent is authorized to pick up
          const authorizedChildIds = authorizedChildren.map(child => child.id);
          const additionalCalledRequests: PickupRequest[] = [];
          
          if (authorizedChildIds.length > 0) {
            console.log('Checking for called requests for authorized children:', authorizedChildIds);
            
            const { data: calledRequests, error: calledError } = await supabase
              .from('pickup_requests')
              .select('*')
              .in('student_id', authorizedChildIds)
              .eq('status', 'called');
            
            if (!calledError && calledRequests) {
              // Filter out requests with invalid IDs and map to our format
              const validCalledRequests = calledRequests
                .filter(req => isValidUUID(req.student_id) && isValidUUID(req.parent_id))
                .map(req => ({
                  id: req.id,
                  studentId: req.student_id,
                  parentId: req.parent_id,
                  requestTime: new Date(req.request_time),
                  status: req.status as 'pending' | 'called' | 'completed' | 'cancelled'
                }));
              
              console.log('Found valid called requests for authorized children:', validCalledRequests);
              additionalCalledRequests.push(...validCalledRequests);
            }
          }
          
          // Combine both sets of requests, avoiding duplicates
          const combinedRequests = [...parentActiveRequests];
          additionalCalledRequests.forEach(req => {
            if (!combinedRequests.some(existing => existing.id === req.id)) {
              combinedRequests.push(req);
            }
          });
          
          console.log('Final combined active requests:', combinedRequests);
          setActiveRequests(combinedRequests);
        } catch (error) {
          console.error('Error loading parent dashboard data:', error);
          toast({
            title: "Error",
            description: "Failed to load data. Please try again.",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      }
    };

    loadData();

    // Set up a refresh interval (in a real app, this would be replaced with websockets)
    const interval = setInterval(async () => {
      if (user) {
        try {
          const parentActiveRequests = await getActivePickupRequestsForParent(user.id);
          
          // Also check for called requests for authorized children
          const authorizedChildIds = children
            .filter(child => child.isAuthorized)
            .map(child => child.id);
          
          const additionalCalledRequests: PickupRequest[] = [];
          
          if (authorizedChildIds.length > 0) {
            const { data: calledRequests, error: calledError } = await supabase
              .from('pickup_requests')
              .select('*')
              .in('student_id', authorizedChildIds)
              .eq('status', 'called');
            
            if (!calledError && calledRequests) {
              // Filter out requests with invalid IDs and map to our format
              const validCalledRequests = calledRequests
                .filter(req => isValidUUID(req.student_id) && isValidUUID(req.parent_id))
                .map(req => ({
                  id: req.id,
                  studentId: req.student_id,
                  parentId: req.parent_id,
                  requestTime: new Date(req.request_time),
                  status: req.status as 'pending' | 'called' | 'completed' | 'cancelled'
                }));
              
              additionalCalledRequests.push(...validCalledRequests);
            }
          }
          
          // Combine both sets of requests, avoiding duplicates
          const combinedRequests = [...parentActiveRequests];
          additionalCalledRequests.forEach(req => {
            if (!combinedRequests.some(existing => existing.id === req.id)) {
              combinedRequests.push(req);
            }
          });
          
          setActiveRequests(combinedRequests);
        } catch (error) {
          console.error('Error refreshing pickup requests:', error);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user, toast]);

  const toggleChildSelection = (studentId: string) => {
    setSelectedChildren(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleRequestPickup = async () => {
    if (!user || !selectedChildren.length) return;

    setIsSubmitting(true);
    try {
      // Create pickup requests for all selected children
      const promises = selectedChildren.map(studentId => 
        createPickupRequest(studentId, user.id)
      );
      await Promise.all(promises);

      toast({
        title: "Pickup Request Sent",
        description: `Your ${selectedChildren.length > 1 ? 'children have' : 'child has'} been added to the pickup queue.`,
      });

      // Refresh the active requests list
      const parentActiveRequests = await getActivePickupRequestsForParent(user.id);
      
      // Also check for called requests for authorized children
      const authorizedChildIds = children
        .filter(child => child.isAuthorized)
        .map(child => child.id);
      
      const additionalCalledRequests: PickupRequest[] = [];
      
      if (authorizedChildIds.length > 0) {
        const { data: calledRequests, error: calledError } = await supabase
          .from('pickup_requests')
          .select('*')
          .in('student_id', authorizedChildIds)
          .eq('status', 'called');
        
        if (!calledError && calledRequests) {
          // Filter out requests with invalid IDs and map to our format
          const validCalledRequests = calledRequests
            .filter(req => isValidUUID(req.student_id) && isValidUUID(req.parent_id))
            .map(req => ({
              id: req.id,
              studentId: req.student_id,
              parentId: req.parent_id,
              requestTime: new Date(req.request_time),
              status: req.status as 'pending' | 'called' | 'completed' | 'cancelled'
            }));
          
          additionalCalledRequests.push(...validCalledRequests);
        }
      }
      
      // Combine both sets of requests, avoiding duplicates
      const combinedRequests = [...parentActiveRequests];
      additionalCalledRequests.forEach(req => {
        if (!combinedRequests.some(existing => existing.id === req.id)) {
          combinedRequests.push(req);
        }
      });
      
      setActiveRequests(combinedRequests);
      
      // Clear the selection
      setSelectedChildren([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create pickup requests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if any children have active requests (either pending or called)
  const childrenWithActiveRequests = activeRequests.map(req => req.studentId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-4 px-4 max-w-7xl">
        <ParentDashboardHeader userName={user?.name} />

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-school-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Authorization Management Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Pickup Authorizations
                </CardTitle>
                <CardDescription>
                  Manage who can pick up your children when you're not available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  You can authorize other parents to pick up your children within specific date ranges. 
                  This is useful for carpools, emergencies, or when you can't make it to pickup.
                </p>
                <Link to="/pickup-authorizations">
                  <Button variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Authorizations
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Main Selection Card */}
              <div className="xl:col-span-2">
                <ChildrenSelectionCard
                  children={children}
                  selectedChildren={selectedChildren}
                  childrenWithActiveRequests={childrenWithActiveRequests}
                  isSubmitting={isSubmitting}
                  onToggleChildSelection={toggleChildSelection}
                  onRequestPickup={handleRequestPickup}
                />
              </div>

              {/* Status Sidebar */}
              <PickupStatusSidebar
                activeRequests={activeRequests}
                children={children}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentDashboard;
