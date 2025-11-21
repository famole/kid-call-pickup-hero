import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

// @ts-ignore - Table not yet in generated types
type SchoolActivitiesTable = any;

export interface SchoolActivity {
  id: string;
  title: string;
  description: string | null;
  activity_date: string;
  activity_time: string | null;
  image_url: string | null;
  location_coords?: { lat: number; lng: number } | null;
  location_name?: string | null;
  link?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  activity_classes?: Array<{
    class_id: string;
    classes: {
      id: string;
      name: string;
    };
  }>;
}

export interface CreateActivityData {
  title: string;
  description?: string;
  activity_date: string;
  activity_time?: string;
  image_url?: string;
  class_ids?: string[];
  location_coords?: { lat: number; lng: number } | null;
  location_name?: string;
  link?: string;
}

export const activitiesService = {
  async getActivities(startDate?: string, endDate?: string, classId?: string | null): Promise<SchoolActivity[]> {
    try {
      // Use RPC function to get activities with properly formatted coordinates
      const { data: activitiesData, error } = await supabase
        .rpc('get_activities_with_coords', {
          p_start_date: startDate || null,
          p_end_date: endDate || null
        });

      if (error) throw error;
      
      let activities = (activitiesData || []) as any[];
      
      // Transform location_lat/lng to location_coords object
      activities = activities.map(activity => {
        const { location_lat, location_lng, ...rest } = activity;
        return {
          ...rest,
          location_coords: (location_lat && location_lng) ? {
            lat: location_lat,
            lng: location_lng
          } : null
        };
      });
      
      // Fetch activity_classes separately
      const activityIds = activities.map(a => a.id);
      if (activityIds.length > 0) {
        const { data: activityClasses } = await supabase
          .from('activity_classes')
          .select(`
            activity_id,
            class_id,
            classes (
              id,
              name
            )
          `)
          .in('activity_id', activityIds);
        
        // Merge activity_classes into activities
        activities = activities.map(activity => ({
          ...activity,
          activity_classes: (activityClasses || []).filter(
            (ac: any) => ac.activity_id === activity.id
          )
        }));
      }
      
      // Filter by class if specified
      if (classId) {
        activities = activities.filter((activity) =>
          activity.activity_classes?.some((ac: any) => ac.class_id === classId)
        );
      } else if (classId === null) {
        // When explicitly filtering for "School-Wide" activities (no classes assigned)
        activities = activities.filter((activity) => 
          !activity.activity_classes || activity.activity_classes.length === 0
        );
      }
      
      return activities as SchoolActivity[];
    } catch (error) {
      logger.error('Error fetching activities:', error);
      throw error;
    }
  },

  async getActivityById(id: string): Promise<SchoolActivity | null> {
    try {
      // Use RPC function to get activity with properly formatted coordinates
      const { data: activitiesData, error } = await supabase
        .rpc('get_activities_with_coords', {
          p_start_date: null,
          p_end_date: null
        });

      if (error) throw error;
      
      // Find the specific activity
      const activity = (activitiesData || []).find((a: any) => a.id === id);
      if (!activity) return null;
      
      // Transform location_lat/lng to location_coords object
      const { location_lat, location_lng, ...rest } = activity;
      const transformedActivity = {
        ...rest,
        location_coords: (location_lat && location_lng) ? {
          lat: location_lat,
          lng: location_lng
        } : null
      };
      
      // Fetch activity_classes
      const { data: activityClasses } = await supabase
        .from('activity_classes')
        .select(`
          activity_id,
          class_id,
          classes (
            id,
            name
          )
        `)
        .eq('activity_id', id);
      
      return {
        ...transformedActivity,
        activity_classes: activityClasses || []
      } as SchoolActivity;
    } catch (error) {
      logger.error('Error fetching activity:', error);
      throw error;
    }
  },

  async createActivity(activityData: CreateActivityData): Promise<SchoolActivity> {
    try {
      // Get current user to set created_by
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated to create activities');
      }

      // Get parent record for the authenticated user
      const { data: parentData, error: parentError } = await supabase
        .from('parents')
        .select('id')
        .eq('email', user.email)
        .single();

      if (parentError || !parentData) {
        throw new Error('Parent record not found for current user');
      }

      const { class_ids, ...activityFields } = activityData;

      const dataToInsert = {
        ...activityFields,
        created_by: parentData.id,
        location_coords: activityData.location_coords 
          ? `POINT(${activityData.location_coords.lng} ${activityData.location_coords.lat})`
          : null
      };

      // @ts-ignore - Table not yet in generated types
      const { data, error } = await supabase
        .from('school_activities')
        .insert([dataToInsert])
        .select()
        .single();

      if (error) throw error;

      // Insert class associations if provided
      if (class_ids && class_ids.length > 0) {
        const classAssociations = class_ids.map(class_id => ({
          activity_id: data.id,
          class_id
        }));

        const { error: classError } = await supabase
          .from('activity_classes')
          .insert(classAssociations);

        if (classError) {
          logger.error('Error creating class associations:', classError);
          // Continue anyway - activity is created
        }
      }
      
      // Parse PostGIS point format and transform to location_coords
      let location_coords = null;
      if ((data as any).location_coords) {
        try {
          if (typeof (data as any).location_coords === 'object' && 'coordinates' in (data as any).location_coords) {
            const coords = (data as any).location_coords.coordinates;
            location_coords = {
              lng: coords[0],
              lat: coords[1]
            };
          } else if (typeof (data as any).location_coords === 'string') {
            const match = (data as any).location_coords.match(/POINT\(([^ ]+) ([^ )]+)\)/);
            if (match) {
              location_coords = {
                lng: parseFloat(match[1]),
                lat: parseFloat(match[2])
              };
            }
          }
        } catch (e) {
          logger.error('Error parsing location_coords:', e);
        }
      }
      
      // Fetch activity_classes for the created activity
      const { data: activityClasses } = await supabase
        .from('activity_classes')
        .select(`
          activity_id,
          class_id,
          classes (
            id,
            name
          )
        `)
        .eq('activity_id', data.id);
      
      return {
        ...data,
        location_coords,
        activity_classes: activityClasses || []
      } as SchoolActivity;
    } catch (error) {
      logger.error('Error creating activity:', error);
      throw error;
    }
  },

  async updateActivity(id: string, activityData: Partial<CreateActivityData>): Promise<SchoolActivity> {
    try {
      const { class_ids, ...activityFields } = activityData;
      const dataToUpdate: any = { ...activityFields };
      
      if (activityData.location_coords !== undefined) {
        dataToUpdate.location_coords = activityData.location_coords 
          ? `POINT(${activityData.location_coords.lng} ${activityData.location_coords.lat})`
          : null;
      }

      // @ts-ignore - Table not yet in generated types
      const { data, error } = await supabase
        .from('school_activities')
        .update(dataToUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update class associations if provided
      if (class_ids !== undefined) {
        // Delete existing associations
        await supabase
          .from('activity_classes')
          .delete()
          .eq('activity_id', id);

        // Insert new associations
        if (class_ids.length > 0) {
          const classAssociations = class_ids.map(class_id => ({
            activity_id: id,
            class_id
          }));

          const { error: classError } = await supabase
            .from('activity_classes')
            .insert(classAssociations);

          if (classError) {
            logger.error('Error updating class associations:', classError);
          }
        }
      }
      
      // Parse PostGIS point format and transform to location_coords
      let location_coords = null;
      if ((data as any).location_coords) {
        try {
          if (typeof (data as any).location_coords === 'object' && 'coordinates' in (data as any).location_coords) {
            const coords = (data as any).location_coords.coordinates;
            location_coords = {
              lng: coords[0],
              lat: coords[1]
            };
          } else if (typeof (data as any).location_coords === 'string') {
            const match = (data as any).location_coords.match(/POINT\(([^ ]+) ([^ )]+)\)/);
            if (match) {
              location_coords = {
                lng: parseFloat(match[1]),
                lat: parseFloat(match[2])
              };
            }
          }
        } catch (e) {
          logger.error('Error parsing location_coords:', e);
        }
      }
      
      // Fetch activity_classes for the updated activity
      const { data: activityClasses } = await supabase
        .from('activity_classes')
        .select(`
          activity_id,
          class_id,
          classes (
            id,
            name
          )
        `)
        .eq('activity_id', id);
      
      return {
        ...data,
        location_coords,
        activity_classes: activityClasses || []
      } as SchoolActivity;
    } catch (error) {
      logger.error('Error updating activity:', error);
      throw error;
    }
  },

  async deleteActivity(id: string): Promise<void> {
    try {
      // @ts-ignore - Table not yet in generated types
      const { error } = await supabase
        .from('school_activities')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      logger.error('Error deleting activity:', error);
      throw error;
    }
  },

  async uploadActivityImage(file: File): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `activities/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      logger.error('Error uploading activity image:', error);
      throw error;
    }
  }
};
