import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, ArrowRight, Download, MapPin, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SchoolActivity } from '@/services/activitiesService';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTranslation as useCustomTranslation } from '@/hooks/useTranslation';
import { downloadActivityAsICS } from '@/utils/calendarExport';
import { toast } from 'sonner';
interface UpcomingActivityCardProps {
  activity: SchoolActivity;
}
export const UpcomingActivityCard = ({
  activity
}: UpcomingActivityCardProps) => {
  const {
    t
  } = useTranslation();
  const {
    isSpanish
  } = useCustomTranslation();
  const handleAddToCalendar = (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      downloadActivityAsICS(activity);
      toast.success(t('activities.addedToCalendar', 'Activity exported to calendar'));
    } catch (error) {
      toast.error(t('activities.calendarExportError', 'Failed to export activity'));
    }
  };
  return <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-background">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-primary shrink-0">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold hidden sm:inline">
                {t('dashboard.upcomingActivity', 'Next Activity')}
              </span>
            </div>
            
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm font-medium truncate">{activity.title}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {format(new Date(activity.activity_date), 'd MMM', {
                locale: isSpanish ? es : undefined
              })}
              </span>
              {activity.activity_time && <span className="hidden md:flex text-xs text-muted-foreground items-center gap-0.5 shrink-0">
                  <Clock className="h-3 w-3" />
                  {activity.activity_time}
                </span>}
              {activity.location_name && <span className="hidden lg:flex text-xs text-muted-foreground items-center gap-0.5 shrink-0">
                  <MapPin className="h-3 w-3" />
                  {activity.location_name}
                </span>}
              {activity.link && <a href={activity.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="hidden sm:flex text-xs text-primary items-center gap-0.5 shrink-0 hover:underline">
                  <ExternalLink className="h-3 w-3" />
                </a>}
            </div>
          </div>

          <Link to="/activities" className="shrink-0">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
              <span className="hidden sm:inline">{t('common.viewAll', 'View All')}</span>
              <ArrowRight className="h-3 w-3 sm:ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>;
};