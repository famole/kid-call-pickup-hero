import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activitiesService, CreateActivityData } from '@/services/activitiesService';
import { toast } from 'sonner';

export const useActivities = (startDate?: string, endDate?: string, classId?: string | null) => {
  return useQuery({
    queryKey: ['activities', startDate, endDate, classId],
    queryFn: () => activitiesService.getActivities(startDate, endDate, classId),
  });
};

export const useActivity = (id: string) => {
  return useQuery({
    queryKey: ['activity', id],
    queryFn: () => activitiesService.getActivityById(id),
    enabled: !!id,
  });
};

export const useCreateActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateActivityData) => activitiesService.createActivity(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Activity created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create activity');
      console.error(error);
    },
  });
};

export const useUpdateActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateActivityData> }) =>
      activitiesService.updateActivity(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Activity updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update activity');
      console.error(error);
    },
  });
};

export const useDeleteActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => activitiesService.deleteActivity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Activity deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete activity');
      console.error(error);
    },
  });
};

export const useUploadActivityImage = () => {
  return useMutation({
    mutationFn: (file: File) => activitiesService.uploadActivityImage(file),
    onError: (error) => {
      toast.error('Failed to upload image');
      console.error(error);
    },
  });
};
