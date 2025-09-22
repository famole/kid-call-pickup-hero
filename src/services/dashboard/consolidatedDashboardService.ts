import { supabase } from "@/integrations/supabase/client";
import { Child, PickupRequest } from '@/types';
import { logger } from '@/utils/logger';

// Define types locally to avoid import issues
interface ChildWithType extends Child {
  isAuthorized?: boolean;
}

interface ParentInfo {
  id: string;
  name: string;
  email?: string;
}

// Consolidated dashboard data interface
export interface ConsolidatedDashboardData {
  children: ChildWithType[];
  activeRequests: PickupRequest[];
  parentInfo: ParentInfo[];
  selfCheckoutStudents: SelfCheckoutStudent[];
  currentParentId: string;
}

export interface SelfCheckoutStudent {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatar?: string;
  className: string;
  classGrade: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  departedAt?: Date;
  notes?: string;
}

// Parent ID cache to avoid repeated RPC calls
let parentIdCache: { [userId: string]: string } = {};
let parentIdCacheTimestamp: { [userId: string]: number } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function to get cached or fresh parent ID
const getCachedParentId = async (userId: string, isEmailUser: boolean): Promise<string> => {
  const now = Date.now();
  
  // Check cache first
  if (parentIdCache[userId] && 
      parentIdCacheTimestamp[userId] && 
      now - parentIdCacheTimestamp[userId] < CACHE_DURATION) {
    logger.log('Using cached parent ID for user:', userId);
    return parentIdCache[userId];
  }

  let parentId = userId; // Default for username users

  if (isEmailUser) {
    // Get parent ID from RPC for email users
    const { data: rpcParentId, error: rpcError } = await supabase.rpc('get_current_parent_id');
    if (rpcParentId) {
      parentId = rpcParentId;
    } else if (rpcError) {
      logger.error('Error fetching parent ID via RPC:', rpcError);
    }
  } else {
    // For username users, get parent ID from localStorage
    const storedParentId = localStorage.getItem('username_parent_id');
    if (storedParentId) {
      parentId = storedParentId;
    }
  }

  // Cache the result
  parentIdCache[userId] = parentId;
  parentIdCacheTimestamp[userId] = now;
  
  return parentId;
};

// Consolidated function to fetch all dashboard data in optimized batches
export const getConsolidatedDashboardData = async (
  userId: string,
  userEmail?: string,
  userRole?: string
): Promise<ConsolidatedDashboardData> => {
  try {
    logger.log('Fetching consolidated dashboard data for user:', userId);
    
    const isEmailUser = Boolean(userEmail);
    const parentId = await getCachedParentId(userId, isEmailUser);
    
    logger.log('Using parent ID for consolidated dashboard:', parentId);

    // Batch all data fetching operations
    const [
      dashboardData,
      pickupRequests,
      selfCheckoutData
    ] = await Promise.all([
      // Dashboard data (children + parent info)
      fetchDashboardData(isEmailUser, userEmail, parentId),
      
      // Pickup requests (consolidated logic)
      fetchPickupRequests(userRole, parentId),
      
      // Self-checkout data (optimized batch query)
      fetchSelfCheckoutDataBatch(parentId)
    ]);

    return {
      children: dashboardData.children,
      activeRequests: pickupRequests,
      parentInfo: dashboardData.parentInfo,
      selfCheckoutStudents: selfCheckoutData,
      currentParentId: parentId
    };

  } catch (error) {
    logger.error('Error in getConsolidatedDashboardData:', error);
    throw error;
  }
};

// Helper: Fetch dashboard data (children + parent info)
const fetchDashboardData = async (
  isEmailUser: boolean, 
  userEmail?: string, 
  parentId?: string
): Promise<{ children: ChildWithType[], parentInfo: ParentInfo[] }> => {
  
  if (isEmailUser && userEmail) {
    // Use optimized query for email users
    const { data, error } = await supabase.rpc('get_parent_dashboard_data_optimized', {
      parent_email: userEmail
    });

    if (error) {
      logger.error('Error fetching optimized dashboard data:', error);
      throw new Error(error.message);
    }

    return {
      children: (data as any)?.all_children || [],
      parentInfo: []
    };
  } else {
    // Use parent ID query for username users
    const { data, error } = await supabase.rpc('get_parent_dashboard_data_by_parent_id', {
      p_parent_id: parentId
    });

    if (error) {
      logger.error('Error fetching dashboard data by parent ID:', error);
      throw new Error(error.message);
    }

    // Get parent info from localStorage for username users
    let parentInfo: ParentInfo[] = [];
    const sessionData = localStorage.getItem('username_session');
    if (sessionData) {
      const updateData: Record<string, any> = JSON.parse(sessionData);
      parentInfo = [{
        id: updateData.id,
        name: updateData.name
      }];
    }

    return {
      children: (data as any)?.all_children || [],
      parentInfo
    };
  }
};

// Helper: Consolidated pickup requests fetching
const fetchPickupRequests = async (
  userRole?: string, 
  parentId?: string
): Promise<PickupRequest[]> => {
  
  if (userRole === 'parent') {
    // For parents, get all affected requests
    const { data, error } = await supabase.rpc('get_parent_affected_pickup_requests');
    
    if (error) {
      logger.error('Error fetching parent affected pickup requests:', error);
      throw new Error(error.message);
    }
    
    return data?.map((item: any) => ({
      id: item.id,
      studentId: item.student_id,
      parentId: item.parent_id,
      requestTime: new Date(item.request_time),
      status: item.status as 'pending' | 'called' | 'completed' | 'cancelled'
    })) || [];
  } else {
    // For family members, get only their own requests
    const { data, error } = await supabase.rpc('get_pickup_requests_for_parent', {
      p_parent_id: parentId
    });
    
    if (error) {
      logger.error('Error fetching pickup requests for parent:', error);
      throw new Error(error.message);
    }
    
    return data?.map((item: any) => ({
      id: item.id,
      studentId: item.student_id,
      parentId: item.parent_id,
      requestTime: new Date(item.request_time),
      status: item.status as 'pending' | 'called' | 'completed' | 'cancelled'
    })) || [];
  }
};

// Helper: Optimized self-checkout data fetching with batch queries
const fetchSelfCheckoutDataBatch = async (parentId: string): Promise<SelfCheckoutStudent[]> => {
  try {
    // Single query to get all self-checkout data with joins
    const { data, error } = await supabase
      .from('self_checkout_authorizations')
      .select(`
        *,
        students!inner (
          id,
          name,
          class_id,
          avatar,
          classes (
            id,
            name,
            grade,
            teacher
          )
        )
      `)
      .eq('authorizing_parent_id', parentId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching self-checkout authorizations batch:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Filter for currently active authorizations
    const today = new Date();
    const activeAuthorizations = data.filter(auth => {
      const startDate = new Date(auth.start_date);
      const endDate = new Date(auth.end_date);
      return today >= startDate && today <= endDate;
    });

    // Batch fetch departure data for all students
    const studentIds = activeAuthorizations.map(auth => auth.student_id);
    const departureData = await fetchTodayDeparturesBatch(studentIds);

    // Build final result
    const result: SelfCheckoutStudent[] = activeAuthorizations.map(auth => {
      const student = auth.students;
      const departure = departureData[auth.student_id];
      
      return {
        id: auth.id,
        studentId: auth.student_id,
        studentName: student?.name || 'Unknown Student',
        studentAvatar: student?.avatar || undefined,
        className: student?.classes?.name || 'Unknown Class',
        classGrade: student?.classes?.grade || 'Unknown',
        startDate: auth.start_date,
        endDate: auth.end_date,
        isActive: true,
        departedAt: departure ? new Date(departure.departed_at) : undefined,
        notes: departure?.notes || undefined
      };
    });

    return result;

  } catch (error) {
    logger.error('Error in fetchSelfCheckoutDataBatch:', error);
    return [];
  }
};

// Helper: Batch fetch today's departures for multiple students
const fetchTodayDeparturesBatch = async (studentIds: string[]): Promise<Record<string, any>> => {
  if (studentIds.length === 0) return {};

  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const { data, error } = await supabase
      .from('student_departures')
      .select('*')
      .in('student_id', studentIds)
      .gte('departed_at', startOfDay.toISOString())
      .lte('departed_at', endOfDay.toISOString())
      .order('departed_at', { ascending: false });

    if (error) {
      logger.error('Error fetching today departures batch:', error);
      return {};
    }

    // Create lookup map by student ID (latest departure per student)
    const departureMap: Record<string, any> = {};
    data?.forEach(departure => {
      if (!departureMap[departure.student_id]) {
        departureMap[departure.student_id] = departure;
      }
    });

    return departureMap;

  } catch (error) {
    logger.error('Error in fetchTodayDeparturesBatch:', error);
    return {};
  }
};

// Clear parent ID cache (useful for logout or user switching)
export const clearParentIdCache = (): void => {
  parentIdCache = {};
  parentIdCacheTimestamp = {};
  logger.log('Parent ID cache cleared');
};
