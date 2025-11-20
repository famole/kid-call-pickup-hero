
import { supabase } from '@/integrations/supabase/client';

export interface PickupHistoryRecord {
  id: string;
  studentId: string;
  parentId: string;
  requestTime: Date;
  calledTime?: Date;
  completedTime: Date;
  pickupDurationMinutes?: number;
  createdAt: Date;
}

export interface PickupHistoryWithDetails extends PickupHistoryRecord {
  studentName?: string;
  parentName?: string;
  className?: string;
}

// Get pickup history for a specific student with pagination
export const getPickupHistoryByStudent = async (
  studentId: string,
  limit: number = 500,
  offset: number = 0
): Promise<PickupHistoryWithDetails[]> => {
  try {
    const { data, error } = await supabase
      .from('pickup_history')
      .select(`
        *,
        students!fk_pickup_history_student(name),
        parents!fk_pickup_history_parent(name)
      `)
      .eq('student_id', studentId)
      .order('completed_time', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      studentId: item.student_id,
      parentId: item.parent_id,
      requestTime: new Date(item.request_time),
      calledTime: item.called_time ? new Date(item.called_time) : undefined,
      completedTime: new Date(item.completed_time),
      pickupDurationMinutes: item.pickup_duration_minutes,
      createdAt: new Date(item.created_at),
      studentName: item.students?.name,
      parentName: item.parents?.name
    }));
  } catch (error) {
    console.error('Error fetching pickup history by student:', error);
    throw error;
  }
};

// Get pickup history for all students with optional date range and pagination
export const getAllPickupHistory = async (
  startDate?: Date,
  endDate?: Date,
  limit: number = 1000,
  offset: number = 0
): Promise<PickupHistoryWithDetails[]> => {
  try {
    let query = supabase
      .from('pickup_history')
      .select(`
        *,
        students!fk_pickup_history_student(name),
        parents!fk_pickup_history_parent(name)
      `)
      .order('completed_time', { ascending: false })
      .range(offset, offset + limit - 1);

    if (startDate) {
      query = query.gte('completed_time', startDate.toISOString());
    }
    if (endDate) {
      // Set end date to end of day (23:59:59.999) to include all records from that day
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte('completed_time', endOfDay.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      studentId: item.student_id,
      parentId: item.parent_id,
      requestTime: new Date(item.request_time),
      calledTime: item.called_time ? new Date(item.called_time) : undefined,
      completedTime: new Date(item.completed_time),
      pickupDurationMinutes: item.pickup_duration_minutes,
      createdAt: new Date(item.created_at),
      studentName: item.students?.name,
      parentName: item.parents?.name
    }));
  } catch (error) {
    console.error('Error fetching all pickup history:', error);
    throw error;
  }
};

// Get pickup statistics for a student
export const getPickupStatsByStudent = async (studentId: string) => {
  try {
    const { data, error } = await supabase
      .from('pickup_history')
      .select('called_time, completed_time')
      .eq('student_id', studentId);

    if (error) throw error;

    const totalPickups = data.length;
    
    // Calculate duration between called_time and completed_time for each record
    const validDurations = data
      .filter(item => item.called_time) // Only include records with called_time
      .map(item => {
        const called = new Date(item.called_time).getTime();
        const completed = new Date(item.completed_time).getTime();
        return (completed - called) / (1000 * 60); // Convert to minutes
      });
    
    const averageDuration = validDurations.length > 0
      ? validDurations.reduce((sum, duration) => sum + duration, 0) / validDurations.length
      : 0;

    return {
      totalPickups,
      averageDuration: Math.round(averageDuration * 100) / 100
    };
  } catch (error) {
    console.error('Error fetching pickup stats:', error);
    throw error;
  }
};

// Get recent pickup history with default limit for faster loading
export const getRecentPickupHistory = async (limit: number = 100): Promise<PickupHistoryWithDetails[]> => {
  try {
    const { data, error } = await supabase
      .from('pickup_history')
      .select(`
        *,
        students!fk_pickup_history_student(name),
        parents!fk_pickup_history_parent(name)
      `)
      .order('completed_time', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      studentId: item.student_id,
      parentId: item.parent_id,
      requestTime: new Date(item.request_time),
      calledTime: item.called_time ? new Date(item.called_time) : undefined,
      completedTime: new Date(item.completed_time),
      pickupDurationMinutes: item.pickup_duration_minutes,
      createdAt: new Date(item.created_at),
      studentName: item.students?.name,
      parentName: item.parents?.name
    }));
  } catch (error) {
    console.error('Error fetching recent pickup history:', error);
    throw error;
  }
};

// Get total count for pagination
export const getPickupHistoryCount = async (
  studentId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<number> => {
  try {
    let query = supabase
      .from('pickup_history')
      .select('*', { count: 'exact', head: true });

    if (studentId) {
      query = query.eq('student_id', studentId);
    }
    if (startDate) {
      query = query.gte('completed_time', startDate.toISOString());
    }
    if (endDate) {
      // Set end date to end of day (23:59:59.999) to include all records from that day
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte('completed_time', endOfDay.toISOString());
    }

    const { count, error } = await query;

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error fetching pickup history count:', error);
    throw error;
  }
};
