import React, { useEffect, useState } from 'react';
import { Post, markPostAsRead, addReaction, removeReaction, deletePost } from '@/services/postsService';
import { useAuth } from '@/context/auth/AuthProvider';
import { useTranslation } from '@/hooks/useTranslation';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { Heart, ThumbsUp, Smile, Link2, Paperclip, Trash2, Eye } from 'lucide-react';
import PostReadReceiptsDialog from './PostReadReceiptsDialog';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

interface PostCardProps {
  post: Post;
  onUpdate: () => void;
}

const EMOJI_OPTIONS = ['👍', '❤️', '😊', '👏', '🎉'];

const PostCard: React.FC<PostCardProps> = ({ post, onUpdate }) => {
  const { user } = useAuth();
  const { t, isSpanish } = useTranslation();
  const [isRead, setIsRead] = useState(false);
  const [myReactions, setMyReactions] = useState<string[]>([]);
  const [readReceiptsOpen, setReadReceiptsOpen] = useState(false);

  const isAuthor = user?.id === post.author_id;
  const canDelete = user?.role === 'admin' || user?.role === 'superadmin' || isAuthor;
  const canViewReadReceipts = user?.role === 'admin' || user?.role === 'superadmin' || isAuthor;

  useEffect(() => {
    // Check if user has read this post
    const userRead = post.post_reads?.some(r => r.parent_id === user?.id);
    setIsRead(!!userRead);

    // Get user's reactions
    const userReactions = post.post_reactions
      ?.filter(r => r.parent_id === user?.id)
      .map(r => r.emoji) || [];
    setMyReactions(userReactions);

    // Mark as read after a short delay
    if (!userRead && user?.id) {
      const timer = setTimeout(() => {
        markPostAsRead(post.id);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [post, user?.id]);

  const handleReaction = async (emoji: string) => {
    if (!user?.id) return;

    try {
      if (myReactions.includes(emoji)) {
        await removeReaction(post.id, emoji);
        setMyReactions(prev => prev.filter(e => e !== emoji));
      } else {
        await addReaction(post.id, emoji);
        setMyReactions(prev => [...prev, emoji]);
      }
      onUpdate();
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deletePost(post.id);
      toast.success(t('communications.postDeleted'));
      onUpdate();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error(t('communications.failedToDelete'));
    }
  };

  // Count reactions by emoji
  const reactionCounts = post.post_reactions?.reduce((acc, reaction) => {
    acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const readCount = post.post_reads?.length || 0;

  return (
    <Card className={`transition-all ${!isRead ? 'border-primary/50 shadow-md' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Avatar className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {post.author?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-left text-sm sm:text-base truncate">{post.author?.name}</p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                <span className="whitespace-nowrap text-left">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: isSpanish ? es : enUS })}</span>
                {post.target_audience_type === 'classes' && post.post_classes && post.post_classes.length > 0 && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="text-xs truncate">
                      {post.post_classes.map(pc => pc.classes?.name).filter(Boolean).join(', ')}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('communications.deletePost')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('communications.deletePostConfirmation')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                    {t('common.delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-2">{post.title}</h3>
          <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
        </div>

        {post.image_url && (
          <div className="rounded-lg overflow-hidden">
            <img src={post.image_url} alt={post.title} className="w-full h-auto object-cover" />
          </div>
        )}

        {post.attachment_url && (
          <a
            href={post.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <Paperclip className="h-4 w-4" />
            <span className="text-sm">{post.attachment_name || t('communications.openAttachment')}</span>
          </a>
        )}

        {post.link_url && (
          <a
            href={post.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <Link2 className="h-4 w-4" />
            <span className="text-sm">{t('communications.openLink')}</span>
          </a>
        )}
      </CardContent>

      <CardFooter className="flex-col items-start gap-4">
        {/* Reaction buttons */}
        <div className="flex flex-wrap gap-2">
          {EMOJI_OPTIONS.map((emoji) => (
            <Button
              key={emoji}
              variant={myReactions.includes(emoji) ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleReaction(emoji)}
              className="gap-1"
            >
              <span>{emoji}</span>
              {reactionCounts[emoji] && (
                <span className="text-xs">{reactionCounts[emoji]}</span>
              )}
            </Button>
          ))}
        </div>

        {/* Read count for authors and admins */}
        {canViewReadReceipts && readCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReadReceiptsOpen(true)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <Eye className="h-4 w-4" />
            <span>{t('communications.readBy', { count: readCount, plural: readCount === 1 ? '' : 's' })}</span>
          </Button>
        )}
      </CardFooter>

      {/* Read Receipts Dialog */}
      <PostReadReceiptsDialog
        open={readReceiptsOpen}
        onOpenChange={setReadReceiptsOpen}
        postId={post.id}
        postTitle={post.title}
      />
    </Card>
  );
};

export default PostCard;
