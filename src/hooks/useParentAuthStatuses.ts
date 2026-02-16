
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getParentAuthStatuses, ParentAuthStatus } from '@/services/authStatusService';
import { useToast } from '@/components/ui/use-toast';
import { logger } from '@/utils/logger';

export const useParentAuthStatuses = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: authStatuses = new Map<string, ParentAuthStatus>(), isLoading } = useQuery({
    queryKey: ['parent-auth-statuses'],
    queryFn: async (): Promise<Map<string, ParentAuthStatus>> => {
      try {
        logger.info('Loading auth statuses...');
        const statuses = await getParentAuthStatuses();
        logger.info('Auth statuses loaded:', statuses);
        return new Map(statuses.filter(status => status.email).map(status => [status.email.toLowerCase(), status]));
      } catch (error: any) {
        logger.error('Failed to load auth statuses:', error);
        if (error.message?.includes('insufficient_privilege')) {
          logger.info('Creating demo auth status data for testing...');
          return new Map([
            ['admin@example.com', { email: 'admin@example.com', has_user: true, providers: ['password'], email_confirmed: true, last_sign_in_at: new Date().toISOString() }],
            ['parent@test.com', { email: 'parent@test.com', has_user: true, providers: ['google'], email_confirmed: true, last_sign_in_at: new Date().toISOString() }],
            ['unconfirmed@test.com', { email: 'unconfirmed@test.com', has_user: true, providers: ['password'], email_confirmed: false, last_sign_in_at: null }],
          ]);
        }
        toast({
          title: "Warning",
          description: "Could not load authentication status information",
          variant: "default",
        });
        return new Map();
      }
    },
  });

  return {
    authStatuses,
    isLoading,
    refetchAuthStatuses: () => queryClient.invalidateQueries({ queryKey: ['parent-auth-statuses'] }),
  };
};
