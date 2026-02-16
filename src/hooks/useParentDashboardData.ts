
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getParentDashboardDataOptimized } from '@/services/parent/optimizedParentQueries';
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
  const identifier = user?.id || user?.email || user?.username;

  const { data: children = [], isLoading: loading } = useQuery({
    queryKey: ['parent-dashboard-data', identifier],
    queryFn: async (): Promise<ChildWithType[]> => {
      logger.log('Loading parent dashboard data for identifier:', identifier);
      const dashboardData = await getParentDashboardDataOptimized(identifier!);
      const childrenWithType: ChildWithType[] = dashboardData.allChildren.map(child => ({
        ...child,
        isAuthorized: (child as any).isAuthorized || false
      }));
      logger.log(`Loaded ${childrenWithType.length} children for parent dashboard`);
      return childrenWithType;
    },
    enabled: !!identifier,
  });

  return { children, loading, isValidUUID };
};
