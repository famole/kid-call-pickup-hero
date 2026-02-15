import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth/AuthProvider';
import { useTranslation } from '@/hooks/useTranslation';
import Navigation from '@/components/Navigation';
import PostCard from '@/components/communications/PostCard';
import CreatePostDialog from '@/components/communications/CreatePostDialog';
import { getPosts, Post } from '@/services/postsService';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const Communications = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const isAdminOrTeacher = user?.role === 'admin' || user?.role === 'teacher' || user?.role === 'superadmin';

  // Load posts
  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const data = await getPosts();
      setPosts(data);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts'
        },
        () => {
          loadPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-background">
      <Navigation />
      <div className="w-full">
        <div className="container mx-auto py-6 px-4 max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2 text-center sm:text-left">
                {t('communications.title')}
              </h1>
              <p className="text-muted-foreground">
                {t('communications.subtitle')}
              </p>
            </div>
            {isAdminOrTeacher && (
              <Button
                onClick={() => setCreateDialogOpen(true)}
                size={isMobile ? 'sm' : 'default'}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {!isMobile && t('communications.createPost')}
              </Button>
            )}
          </div>

          {/* Posts Feed */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">{t('common.loading')}</p>
              </div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border">
              <p className="text-muted-foreground text-lg mb-2">
                {t('communications.noPosts')}
              </p>
              <p className="text-sm text-muted-foreground">
                {isAdminOrTeacher
                  ? t('communications.createFirstPost')
                  : t('communications.checkBackLater')}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} onUpdate={loadPosts} />
              ))}
            </div>
          )}

          {/* Create Post Dialog */}
          {isAdminOrTeacher && (
            <CreatePostDialog
              open={createDialogOpen}
              onOpenChange={setCreateDialogOpen}
              onSuccess={loadPosts}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Communications;
