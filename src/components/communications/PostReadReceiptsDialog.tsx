import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ReadReceipt {
  id: string;
  read_at: string;
  parent: {
    id: string;
    name: string;
    email: string | null;
  };
}

interface PostReadReceiptsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postTitle: string;
}

const PostReadReceiptsDialog: React.FC<PostReadReceiptsDialogProps> = ({
  open,
  onOpenChange,
  postId,
  postTitle,
}) => {
  const { t, isSpanish } = useTranslation();
  const [receipts, setReceipts] = useState<ReadReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadReadReceipts();
    }
  }, [open, postId]);

  const loadReadReceipts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('post_reads')
        .select(`
          id,
          read_at,
          parent:parents!post_reads_parent_id_fkey (
            id,
            name,
            email
          )
        `)
        .eq('post_id', postId)
        .order('read_at', { ascending: false });

      if (error) throw error;
      setReceipts(data || []);
    } catch (error) {
      console.error('Error loading read receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-left">{t('communications.readReceipts')}</DialogTitle>
          <p className="text-sm text-muted-foreground text-left">{postTitle}</p>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : receipts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('communications.noReads')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {receipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {receipt.parent.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate text-left">
                      {receipt.parent.name}
                    </p>
                    {receipt.parent.email && (
                      <p className="text-xs text-muted-foreground truncate text-left">
                        {receipt.parent.email}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(receipt.read_at), {
                        addSuffix: true,
                        locale: isSpanish ? es : enUS,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default PostReadReceiptsDialog;
