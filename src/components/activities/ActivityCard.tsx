import { format } from 'date-fns';
import { Calendar, Clock, Download, MapPin, ExternalLink, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SchoolActivity } from '@/services/activitiesService';
import { useTranslation } from 'react-i18next';
import { downloadActivityAsICS } from '@/utils/calendarExport';
import { toast } from 'sonner';

interface ActivityCardProps {
  activity: SchoolActivity;
  onClick?: () => void;
  onDelete?: (activity: SchoolActivity) => void;
  isAdmin?: boolean;
}

export const ActivityCard = ({ activity, onClick, onDelete, isAdmin }: ActivityCardProps) => {
  const { t } = useTranslation();
  
  const handleAddToCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      downloadActivityAsICS(activity);
      toast.success(t('activities.addedToCalendar', 'Activity exported to calendar'));
    } catch (error) {
      toast.error(t('activities.calendarExportError', 'Failed to export activity'));
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(activity);
  };
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      {activity.image_url && (
        <div className="w-full h-48 overflow-hidden rounded-t-lg">
          <img
            src={activity.image_url}
            alt={activity.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-semibold text-lg line-clamp-2 md:line-clamp-none flex-1">{activity.title}</h3>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleAddToCalendar}
              title={t('activities.addToCalendar', 'Add to calendar')}
            >
              <Download className="h-4 w-4" />
            </Button>
            {isAdmin && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={handleDelete}
                title={t('activities.deleteActivity', 'Delete activity')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {activity.activity_classes && activity.activity_classes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {activity.activity_classes.map((ac) => (
                  <Badge key={ac.class_id} variant="secondary">
                    {ac.classes.name}
                  </Badge>
                ))}
              </div>
            )}
            {(!activity.activity_classes || activity.activity_classes.length === 0) && (
              <Badge variant="outline">
                {t('activities.allSchool', 'All School')}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(activity.activity_date), 'MMMM d, yyyy')}</span>
          </div>
          {activity.activity_time && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{activity.activity_time}</span>
            </div>
          )}
          {activity.location_name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{activity.location_name}</span>
              {activity.location_coords && (
                <a
                  href={`https://www.google.com/maps?q=${activity.location_coords.lat},${activity.location_coords.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  ({t('activities.viewOnMap', 'View on map')})
                </a>
              )}
            </div>
          )}
          {activity.link && (
            <div className="flex items-center gap-2 text-sm">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <a
                href={activity.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {t('activities.openLink', 'Open link')}
              </a>
            </div>
          )}
          {activity.description && (
            <div 
              className="text-sm text-muted-foreground line-clamp-2 md:line-clamp-none mt-2 prose prose-sm max-w-none [&>*]:my-0"
              dangerouslySetInnerHTML={{ __html: activity.description }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
