import { useQuery } from '@tanstack/react-query';
import { activitiesService, SchoolActivity } from '@/services/activitiesService';
import { format } from 'date-fns';

export const useUpcomingActivity = () => {
  return useQuery({
    queryKey: ['upcoming-activity'],
    queryFn: async (): Promise<SchoolActivity | null> => {
      const today = format(new Date(), 'yyyy-MM-dd');
      // Fetch activities starting from today, limit to 1
      const activities = await activitiesService.getActivities(today, undefined, undefined);
      
      // Return the first activity (earliest date)
      return activities.length > 0 ? activities[0] : null;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
};
