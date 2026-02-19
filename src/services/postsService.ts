import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Post {
  id: string;
  title: string;
  content: string;
  author_id: string;
  image_url?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  link_url?: string | null;
  target_audience_type: 'all' | 'classes';
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    name: string;
    role: string;
  };
  post_classes?: { class_id: string; classes?: { name: string; grade: string } }[];
  post_reactions?: { emoji: string; parent_id: string }[];
  post_reads?: { parent_id: string; read_at: string }[];
}

export interface CreatePostData {
  title: string;
  content: string;
  image_url?: string;
  attachment_url?: string;
  attachment_name?: string;
  link_url?: string;
  target_audience_type: 'all' | 'classes';
  class_ids?: string[];
}

const PAGE_SIZE = 5;

// Get paginated posts visible to current user
export const getPosts = async (page = 0): Promise<{ posts: Post[]; hasMore: boolean }> => {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      author:parents!posts_author_id_fkey(id, name, role),
      post_classes(class_id, classes(name, grade)),
      post_reactions(emoji, parent_id),
      post_reads(parent_id, read_at)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to + 1); // fetch one extra to check if there are more

  if (error) {
    console.error('Error fetching posts:', error);
    toast.error('Failed to load posts');
    throw error;
  }

  const hasMore = (data?.length ?? 0) > PAGE_SIZE;
  const posts = (data ?? []).slice(0, PAGE_SIZE);

  return { posts: posts as unknown as Post[], hasMore };
};

// Create a new post
export const createPost = async (postData: CreatePostData): Promise<Post> => {
  const { class_ids, ...postFields } = postData;

  // Get current parent ID (not auth.uid, but the parents table ID)
  const { data: parentData, error: parentError } = await supabase
    .rpc('get_current_parent_id');

  if (parentError || !parentData) {
    console.error('Error getting parent ID:', parentError);
    toast.error('Not authorized to create posts');
    throw new Error('Not authorized');
  }

  // Create the post
  const { data: post, error: postError } = await supabase
    .from('posts')
    .insert([{ ...postFields, author_id: parentData }])
    .select(`
      *,
      author:parents!posts_author_id_fkey(id, name, role)
    `)
    .single();

  if (postError) {
    console.error('Error creating post:', postError);
    toast.error('Failed to create post');
    throw postError;
  }

  // If class-specific, add class associations
  if (postData.target_audience_type === 'classes' && class_ids && class_ids.length > 0) {
    const classAssociations = class_ids.map(class_id => ({
      post_id: post.id,
      class_id
    }));

    const { error: classError } = await supabase
      .from('post_classes')
      .insert(classAssociations);

    if (classError) {
      console.error('Error associating classes:', classError);
      // Don't fail the whole operation, but log the error
    }
  }

  toast.success('Post created successfully');
  return post as unknown as Post;
};

// Update a post
export const updatePost = async (postId: string, postData: Partial<CreatePostData>): Promise<Post> => {
  const { class_ids, ...postFields } = postData;

  const { data: post, error: postError } = await supabase
    .from('posts')
    .update(postFields)
    .eq('id', postId)
    .select(`
      *,
      author:parents!posts_author_id_fkey(id, name, role)
    `)
    .single();

  if (postError) {
    console.error('Error updating post:', postError);
    toast.error('Failed to update post');
    throw postError;
  }

  // Update class associations if needed
  if (postData.target_audience_type === 'classes' && class_ids !== undefined) {
    // Delete existing associations
    await supabase.from('post_classes').delete().eq('post_id', postId);

    // Add new associations
    if (class_ids.length > 0) {
      const classAssociations = class_ids.map(class_id => ({
        post_id: postId,
        class_id
      }));

      await supabase.from('post_classes').insert(classAssociations);
    }
  }

  toast.success('Post updated successfully');
  return post as unknown as Post;
};

// Delete a post (soft delete)
export const deletePost = async (postId: string): Promise<void> => {
  const { error } = await supabase
    .from('posts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', postId);

  if (error) {
    console.error('Error deleting post:', error);
    toast.error('Failed to delete post');
    throw error;
  }

  toast.success('Post deleted successfully');
};

// Mark a post as read
export const markPostAsRead = async (postId: string): Promise<void> => {
  const { data: parentId, error: parentError } = await supabase.rpc('get_current_parent_id');
  if (parentError || !parentId) return;

  const { error } = await supabase
    .from('post_reads')
    .upsert([{ post_id: postId, parent_id: parentId }], { onConflict: 'post_id,parent_id' });

  if (error && error.code !== '23505') { // Ignore duplicate key errors
    console.error('Error marking post as read:', error);
  }
};

// Add emoji reaction to a post
export const addReaction = async (postId: string, emoji: string): Promise<void> => {
  const { data: parentId, error: parentError } = await supabase.rpc('get_current_parent_id');
  if (parentError || !parentId) {
    toast.error('Not authorized');
    throw new Error('Not authenticated');
  }

  const { error } = await supabase
    .from('post_reactions')
    .insert([{ post_id: postId, emoji, parent_id: parentId }]);

  if (error && error.code !== '23505') { // Ignore duplicate key errors
    console.error('Error adding reaction:', error);
    toast.error('Failed to add reaction');
    throw error;
  }
};

// Remove emoji reaction from a post
export const removeReaction = async (postId: string, emoji: string): Promise<void> => {
  const { data: parentId, error: parentError } = await supabase.rpc('get_current_parent_id');
  if (parentError || !parentId) {
    toast.error('Not authorized');
    throw new Error('Not authenticated');
  }

  const { error } = await supabase
    .from('post_reactions')
    .delete()
    .eq('post_id', postId)
    .eq('emoji', emoji)
    .eq('parent_id', parentId);

  if (error) {
    console.error('Error removing reaction:', error);
    toast.error('Failed to remove reaction');
    throw error;
  }
};

// Upload post image
export const uploadPostImage = async (file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `posts/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('public')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading image:', uploadError);
    toast.error('Failed to upload image');
    throw uploadError;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('public')
    .getPublicUrl(filePath);

  return publicUrl;
};

// Upload post attachment
export const uploadPostAttachment = async (file: File): Promise<{ url: string; name: string }> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}_${file.name}`;
  const filePath = `posts/attachments/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('public')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading attachment:', uploadError);
    toast.error('Failed to upload attachment');
    throw uploadError;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('public')
    .getPublicUrl(filePath);

  return { url: publicUrl, name: file.name };
};
