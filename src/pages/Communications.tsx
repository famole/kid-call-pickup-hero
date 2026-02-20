import React, { useEffect, useState, useRef, useCallback } from 'react';
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
import PageHeader from '@/components/PageHeader';

const Communications = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const isAdminOrTeacher = user?.role === 'admin' || user?.role === 'teacher' || user?.role === 'superadmin';

  const loadPosts = useCallback(async (reset = false) => {
    const currentPage = reset ? 0 : page;
    if (!reset && loadingMore) return;

    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const { posts: newPosts, hasMore: more } = await getPosts(currentPage);
      setPosts(prev => reset ? newPosts : [...prev, ...newPosts]);
      setHasMore(more);
      if (!reset) setPage(p => p + 1);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [page, loadingMore]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const { posts: newPosts, hasMore: more } = await getPosts(0);
        setPosts(newPosts);
        setHasMore(more);
        setPage(1);
      } catch (error) {
        console.error('Error loading posts:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Real-time subscription — reset on any change
  useEffect(() => {
    const channel = supabase
      .channel('posts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, async () => {
        setLoading(true);
        try {
          const { posts: newPosts, hasMore: more } = await getPosts(0);
          setPosts(newPosts);
          setHasMore(more);
          setPage(1);
        } catch {}
        finally { setLoading(false); }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadPosts(false);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadPosts]);

  const handlePostUpdate = useCallback(async () => {
    setLoading(true);
    try {
      const { posts: newPosts, hasMore: more } = await getPosts(0);
      setPosts(newPosts);
      setHasMore(more);
      setPage(1);
    } catch {}
    finally { setLoading(false); }
  }, []);

  return (
    <div className="min-h-screen w-full bg-background">
      <Navigation />
      <div className="w-full">
        <div className="container mx-auto py-6 px-4 max-w-4xl">
          <PageHeader
            title={t('communications.title')}
            description={t('communications.subtitle')}
            actions={
              isAdminOrTeacher ? (
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  size={isMobile ? 'sm' : 'default'}
                  className="gap-2 bg-school-primary hover:bg-school-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  {!isMobile && t('communications.createPost')}
                </Button>
              ) : undefined
            }
          />

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
                <PostCard key={post.id} post={post} onUpdate={handlePostUpdate} />
              ))}
              <div ref={sentinelRef} className="h-4" />
              {loadingMore && (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
              {!hasMore && !loadingMore && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-2xl mb-2">🎉</p>
                  <p className="text-sm">{t('communications.allCaughtUp')}</p>
                </div>
              )}
            </div>
          )}

          {isAdminOrTeacher && (
            <CreatePostDialog
              open={createDialogOpen}
              onOpenChange={setCreateDialogOpen}
              onSuccess={handlePostUpdate}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Communications;
