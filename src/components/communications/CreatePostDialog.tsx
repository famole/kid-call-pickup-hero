import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/auth/AuthProvider';
import { useTranslation } from '@/hooks/useTranslation';
import { createPost, uploadPostImage, uploadPostAttachment, CreatePostData } from '@/services/postsService';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ImagePlus, Paperclip, Link2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const postSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required'),
  target_audience_type: z.enum(['all', 'classes']),
  class_ids: z.array(z.string()).optional(),
  link_url: z.string().url().optional().or(z.literal('')),
});

type PostFormData = z.infer<typeof postSchema>;

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CreatePostDialog: React.FC<CreatePostDialogProps> = ({ open, onOpenChange, onSuccess }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [classes, setClasses] = useState<Array<{ id: string; name: string; grade: string }>>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: '',
      content: '',
      target_audience_type: 'all',
      class_ids: [],
      link_url: '',
    },
  });

  const targetAudienceType = watch('target_audience_type');
  const selectedClassIds = watch('class_ids') || [];

  // Load classes
  useEffect(() => {
    if (open) {
      loadClasses();
    }
  }, [open]);

  const loadClasses = async () => {
    const { data, error } = await supabase
      .from('classes')
      .select('id, name, grade')
      .order('grade', { ascending: true })
      .order('name', { ascending: true });

    if (!error && data) {
      setClasses(data);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedAttachment(file);
    }
  };

  const onSubmit = async (data: PostFormData) => {
    if (!user?.id) return;

    setLoading(true);
    try {
      let imageUrl: string | undefined;
      let attachmentUrl: string | undefined;
      let attachmentName: string | undefined;

      // Upload image if selected
      if (selectedImage) {
        setUploading(true);
        imageUrl = await uploadPostImage(selectedImage);
      }

      // Upload attachment if selected
      if (selectedAttachment) {
        setUploading(true);
        const result = await uploadPostAttachment(selectedAttachment);
        attachmentUrl = result.url;
        attachmentName = result.name;
      }

      setUploading(false);

      const postData: CreatePostData = {
        title: data.title,
        content: data.content,
        target_audience_type: data.target_audience_type,
        image_url: imageUrl,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
        link_url: data.link_url || undefined,
        class_ids: data.target_audience_type === 'classes' ? data.class_ids : undefined,
      };

      await createPost(postData);
      
      toast.success(t('communications.postCreated'));
      
      // Reset form and close dialog
      reset();
      setSelectedImage(null);
      setSelectedAttachment(null);
      setImagePreview(null);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error(t('communications.failedToCreate'));
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const toggleClassSelection = (classId: string) => {
    const current = selectedClassIds;
    const updated = current.includes(classId)
      ? current.filter(id => id !== classId)
      : [...current, classId];
    setValue('class_ids', updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('communications.createPost')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t('communications.postTitle')} *</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder={t('communications.postTitlePlaceholder')}
              disabled={loading}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">{t('communications.postContent')} *</Label>
            <Textarea
              id="content"
              {...register('content')}
              placeholder={t('communications.postContentPlaceholder')}
              rows={6}
              disabled={loading}
            />
            {errors.content && (
              <p className="text-sm text-destructive">{errors.content.message}</p>
            )}
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <Label>{t('communications.targetAudience')} *</Label>
            <RadioGroup
              value={targetAudienceType}
              onValueChange={(value) => setValue('target_audience_type', value as 'all' | 'classes')}
              disabled={loading}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="font-normal cursor-pointer">
                  {t('communications.allParents')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="classes" id="classes" />
                <Label htmlFor="classes" className="font-normal cursor-pointer">
                  {t('communications.specificClasses')}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Class Selection */}
          {targetAudienceType === 'classes' && (
            <div className="space-y-2">
              <Label>{t('communications.selectClasses')} *</Label>
              <div className="border rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
                {classes.map((cls) => (
                  <div key={cls.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={cls.id}
                      checked={selectedClassIds.includes(cls.id)}
                      onCheckedChange={() => toggleClassSelection(cls.id)}
                      disabled={loading}
                    />
                    <Label htmlFor={cls.id} className="font-normal cursor-pointer">
                      {cls.grade} - {cls.name}
                    </Label>
                  </div>
                ))}
              </div>
              {errors.class_ids && (
                <p className="text-sm text-destructive">{errors.class_ids.message}</p>
              )}
            </div>
          )}

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>{t('communications.image')}</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('image-upload')?.click()}
                disabled={loading}
              >
                <ImagePlus className="h-4 w-4 mr-2" />
                {selectedImage ? t('common.update') : t('communications.uploadImage')}
              </Button>
              {selectedImage && <span className="text-sm text-muted-foreground">{selectedImage.name}</span>}
            </div>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              disabled={loading}
            />
            {imagePreview && (
              <img src={imagePreview} alt="Preview" className="mt-2 max-h-40 rounded-lg" />
            )}
          </div>

          {/* Attachment Upload */}
          <div className="space-y-2">
            <Label>{t('communications.attachment')}</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('attachment-upload')?.click()}
                disabled={loading}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                {selectedAttachment ? t('common.update') : t('communications.uploadAttachment')}
              </Button>
              {selectedAttachment && (
                <span className="text-sm text-muted-foreground">{selectedAttachment.name}</span>
              )}
            </div>
            <input
              id="attachment-upload"
              type="file"
              onChange={handleAttachmentSelect}
              className="hidden"
              disabled={loading}
            />
          </div>

          {/* Link */}
          <div className="space-y-2">
            <Label htmlFor="link_url">{t('communications.link')}</Label>
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <Input
                id="link_url"
                {...register('link_url')}
                type="url"
                placeholder={t('communications.linkPlaceholder')}
                disabled={loading}
              />
            </div>
            {errors.link_url && (
              <p className="text-sm text-destructive">{errors.link_url.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {uploading ? t('common.loading') : t('communications.createPost')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostDialog;
