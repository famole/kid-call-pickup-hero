
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

// Get pickup history for a specific student
export const getPickupHistoryByStudent = async (studentId: string): Promise<PickupHistoryWithDetails[]> => {
  try {
    const { data, error } = await supabase
      .from('pickup_history')
      .select('*')
      .eq('student_id', studentId)
      .order('completed_time', { ascending: false });

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      studentId: item.student_id,
      parentId: item.parent_id,
      requestTime: new Date(item.request_time),
      calledTime: item.called_time ? new Date(item.called_time) : undefined,
      completedTime: new Date(item.completed_time),
      pickupDurationMinutes: item.pickup_duration_minutes,
      createdAt: new Date(item.created_at)
    }));
  } catch (error) {
    console.error('Error fetching pickup history by student:', error);
    throw error;
  }
};

// Get pickup history for all students with optional date range
export const getAllPickupHistory = async (
  startDate?: Date,
  endDate?: Date
): Promise<PickupHistoryWithDetails[]> => {
  try {
    let query = supabase
      .from('pickup_history')
      .select('*')
      .order('completed_time', { ascending: false });

    if (startDate) {
      query = query.gte('completed_time', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('completed_time', endDate.toISOString());
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
      createdAt: new Date(item.created_at)
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
      .select('pickup_duration_minutes, completed_time')
      .eq('student_id', studentId);

    if (error) throw error;

    const totalPickups = data.length;
    const averageDuration = data.length > 0 
      ? data.reduce((sum, item) => sum + (item.pickup_duration_minutes || 0), 0) / data.length 
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
