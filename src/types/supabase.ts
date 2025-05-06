
// This file contains application-specific types that extend or use Supabase types
import { Database } from '@/integrations/supabase/types';

// Define any additional types needed for Supabase integration
export type PickupRequestWithDetails = {
  request: {
    id: string;
    childId: string;
    parentId: string;
    requestTime: Date;
    status: 'pending' | 'called' | 'completed' | 'cancelled';
  };
  child?: {
    id: string;
    name: string;
    classId: string;
    parentIds: string[];
    avatar?: string;
  };
  class?: {
    id: string;
    name: string;
    grade: string;
    teacher: string;
  };
};

// You can also export existing Supabase types to use throughout your app
export type DbTables = Database['public']['Tables'];
