
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getParentDashboardDataOptimized } from '@/services/parent/optimizedParentQueries';
import { supabase } from '@/integrations/supabase/client';
import { Child } from '@/types';
import { logger } from '@/utils/logger';

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
      if (user?.id || user?.email || user?.username) {
        try {
          setLoading(true);
          // For OAuth and email users, always use email as identifier
          // For username-only users, use their parent ID or username
          const identifier = user.email || user.id || user.username;
          logger.log('Loading parent dashboard data for identifier:', identifier);
          
          // Use the optimized query that only fetches relevant students
          const dashboardData = await getParentDashboardDataOptimized(identifier!);
          
          // Transform to include isAuthorized flag
          const childrenWithType: ChildWithType[] = dashboardData.allChildren.map(child => ({
            ...child,
            isAuthorized: (child as any).isAuthorized || false
          }));
          
          setChildren(childrenWithType);
          logger.log(`Loaded ${childrenWithType.length} children for parent dashboard`);
        } catch (error) {
          logger.error('Error loading parent dashboard data:', error);
          setChildren([]);
        } finally {
          setLoading(false);
        }
      } else {
        // For users without any identifier, clear children
        setChildren([]);
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id, user?.email, user?.username]);

  return { children, loading, isValidUUID };
};
