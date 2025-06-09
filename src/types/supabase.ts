
// This file contains application-specific types that extend or use Supabase types
import { Database } from '@/integrations/supabase/types';

// Define a type for the pickup_requests table shape in our database
export interface PickupRequestRow {
  id: string;
  student_id: string; // Now a proper UUID string
  parent_id: string;  // Now a proper UUID string
  request_time: string;
  status: 'pending' | 'called' | 'completed' | 'cancelled';
}

// Define any additional types needed for Supabase integration
export type PickupRequestWithDetails = {
  request: {
    id: string;
    studentId: string;
    parentId: string; // We maintain this property name for internal consistency
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
