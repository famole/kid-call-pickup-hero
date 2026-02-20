import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Upload, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useCreateActivity, useUpdateActivity, useUploadActivityImage } from '@/hooks/useActivities';
import { SchoolActivity } from '@/services/activitiesService';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LocationPicker } from './LocationPicker';

const activitySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  activity_date: z.date(),
  activity_time: z.string().optional(),
  class_ids: z.array(z.string()).optional(),
  location_name: z.string().optional(),
  location_lat: z.string().optional(),
  location_lng: z.string().optional(),
  link: z.string().url().optional().or(z.literal('')),
});

type ActivityFormData = z.infer<typeof activitySchema>;

interface ActivityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity?: SchoolActivity | null;
}

export const ActivityFormDialog = ({ open, onOpenChange, activity }: ActivityFormDialogProps) => {
  const { t } = useTranslation();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(activity?.image_url || null);
  const [addLocation, setAddLocation] = useState(
    !!(activity?.location_name || activity?.location_coords)
  );
  
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity();
  const uploadImage = useUploadActivityImage();

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      title: activity?.title || '',
      description: activity?.description || '',
      activity_date: activity?.activity_date ? new Date(activity.activity_date) : new Date(),
      activity_time: activity?.activity_time || '',
      class_ids: activity?.activity_classes?.map(ac => ac.class_id) || [],
      location_name: activity?.location_name || '',
      location_lat: activity?.location_coords?.lat?.toString() || '',
      location_lng: activity?.location_coords?.lng?.toString() || '',
      link: activity?.link || '',
    },
  });

  useEffect(() => {
    if (open && !activity) {
      // Reset form for new activity
      form.reset({
        title: '',
        description: '',
        activity_date: new Date(),
        activity_time: '',
        class_ids: [],
        location_name: '',
        location_lat: '',
        location_lng: '',
        link: '',
      });
      setImageFile(null);
      setImagePreview(null);
      setAddLocation(false);
    } else if (activity) {
      // Load existing activity data
      form.reset({
        title: activity.title,
        description: activity.description || '',
        activity_date: new Date(activity.activity_date),
        activity_time: activity.activity_time || '',
        class_ids: activity.activity_classes?.map(ac => ac.class_id) || [],
        location_name: activity.location_name || '',
        location_lat: activity.location_coords?.lat?.toString() || '',
        location_lng: activity.location_coords?.lng?.toString() || '',
        link: activity.link || '',
      });
      setImagePreview(activity.image_url);
      setAddLocation(!!(activity.location_name || activity.location_coords));
    }
  }, [open, activity, form]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: ActivityFormData) => {
    try {
      let imageUrl = activity?.image_url;

      if (imageFile) {
        imageUrl = await uploadImage.mutateAsync(imageFile);
      }

      const location_coords = data.location_lat && data.location_lng
        ? { lat: parseFloat(data.location_lat), lng: parseFloat(data.location_lng) }
        : undefined;

      const activityData = {
        title: data.title,
        description: data.description,
        activity_date: format(data.activity_date, 'yyyy-MM-dd'),
        activity_time: data.activity_time || undefined,
        image_url: imageUrl,
        class_ids: data.class_ids,
        location_coords,
        location_name: data.location_name || undefined,
        link: data.link || undefined,
      };

      if (activity) {
        await updateActivity.mutateAsync({ id: activity.id, data: activityData });
      } else {
        await createActivity.mutateAsync(activityData);
      }

      onOpenChange(false);
      form.reset();
      setImageFile(null);
      setImagePreview(null);
    } catch (error) {
      console.error('Error saving activity:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {activity ? t('activities.editActivity', 'Edit Activity') : t('activities.createActivity', 'Create New Activity')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('activities.title', 'Title')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('activities.titlePlaceholder', 'Activity title')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('activities.description', 'Description')}</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      content={field.value || ''}
                      onChange={field.onChange}
                      placeholder={t('activities.descriptionPlaceholder', 'Activity description')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="activity_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('activities.date', 'Date')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>{t('activities.pickDate', 'Pick a date')}</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="activity_time"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('activities.time', 'Time (optional)')}</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="class_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('activities.classes', 'Classes')}</FormLabel>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="school-wide"
                        checked={!field.value || field.value.length === 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            field.onChange([]);
                          }
                        }}
                      />
                      <label htmlFor="school-wide" className="text-sm">
                        {t('activities.schoolWide', 'School-Wide (All Classes)')}
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                      {classes?.map((cls) => (
                        <div key={cls.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`class-${cls.id}`}
                            checked={field.value?.includes(cls.id) || false}
                            onCheckedChange={(checked) => {
                              const currentValue = field.value || [];
                              if (checked) {
                                field.onChange([...currentValue, cls.id]);
                              } else {
                                field.onChange(currentValue.filter((id) => id !== cls.id));
                              }
                            }}
                          />
                          <label htmlFor={`class-${cls.id}`} className="text-sm">
                            {cls.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>{t('activities.image', 'Image (optional)')}</FormLabel>
              {imagePreview && (
                <div className="relative w-full h-48 rounded-lg overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {!imagePreview && (
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {t('activities.uploadImage', 'Click to upload image')}
                    </span>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="add-location"
                  checked={addLocation}
                  onCheckedChange={(checked) => {
                    setAddLocation(checked as boolean);
                    if (!checked) {
                      form.setValue('location_name', '');
                      form.setValue('location_lat', '');
                      form.setValue('location_lng', '');
                    }
                  }}
                />
                <label
                  htmlFor="add-location"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {t('activities.addLocation', 'Add Location')}
                </label>
              </div>

              {addLocation && (
                <LocationPicker
                  locationName={form.watch('location_name') || ''}
                  lat={form.watch('location_lat') ? parseFloat(form.watch('location_lat')!) : null}
                  lng={form.watch('location_lng') ? parseFloat(form.watch('location_lng')!) : null}
                  onLocationChange={(lat, lng) => {
                    form.setValue('location_lat', lat.toString());
                    form.setValue('location_lng', lng.toString());
                  }}
                  onLocationNameChange={(name) => {
                    form.setValue('location_name', name);
                  }}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('activities.link', 'Link (optional)')}</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                type="submit"
                disabled={
                  createActivity.isPending ||
                  updateActivity.isPending ||
                  uploadImage.isPending
                }
              >
                {activity ? t('activities.updateActivity', 'Update Activity') : t('activities.createActivity', 'Create Activity')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
