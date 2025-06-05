
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getStudentsForParent } from '@/services/studentService';
import { checkPickupAuthorization } from '@/services/pickupAuthorizationService';
import { supabase } from '@/integrations/supabase/client';
import { Child } from '@/types';

interface ChildWithType extends Child {
  isAuthorized?: boolean;
}

// Function to check if a string is a valid UUID
const isValidUUID = (id: string): boolean => {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

export const useParentDashboardData = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<ChildWithType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (user) {
        try {
          setLoading(true);
          // Get children for this parent from the database
          const parentChildren = await getStudentsForParent(user.id);
          
          // Use server-side helper to get current parent ID and verify access
          const { data: currentParentId, error: parentError } = await supabase.rpc('get_current_parent_id');
          
          if (parentError || !currentParentId) {
            console.error('Error getting current parent ID:', parentError);
            // Fallback to just the parent's own children
            const ownChildren: ChildWithType[] = parentChildren.map(child => ({
              ...child,
              isAuthorized: false
            }));
            setChildren(ownChildren);
            return;
          }
          
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
        } catch (error) {
          console.error('Error loading parent dashboard data:', error);
          throw error;
        } finally {
          setLoading(false);
        }
      }
    };

    loadData();
  }, [user]);

  return { children, loading, isValidUUID };
};
