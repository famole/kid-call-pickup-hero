import { format } from 'date-fns';
import { Calendar, Clock, MapPin, Download, Edit, Trash2, ExternalLink, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SchoolActivity } from '@/services/activitiesService';
import { useTranslation } from '@/hooks/useTranslation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

interface ActivityDetailModalProps {
  activity: SchoolActivity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (activity: SchoolActivity) => void;
  onDelete?: (activity: SchoolActivity) => void;
  onDownload?: (activity: SchoolActivity) => void;
  isAdmin: boolean;
}

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '0.5rem',
};

export const ActivityDetailModal = ({
  activity,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onDownload,
  isAdmin,
}: ActivityDetailModalProps) => {
  const { t } = useTranslation();
  
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    id: 'google-map-script',
  });

  if (!activity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-2xl">{activity.title}</DialogTitle>
            </DialogHeader>

            {/* Image */}
            {activity.image_url && (
              <div className="w-full h-48 rounded-lg overflow-hidden bg-muted mb-4">
                <img 
                  src={activity.image_url} 
                  alt={activity.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Date, Time, Location */}
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-5 w-5" />
                <span className="font-medium">{format(new Date(activity.activity_date), 'MMMM dd, yyyy')}</span>
              </div>
              
              {activity.activity_time && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-5 w-5" />
                  <span>{activity.activity_time}</span>
                </div>
              )}


              {activity.link && (
                <a 
                  href={activity.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <ExternalLink className="h-5 w-5" />
                  <span>{t('activities.viewLink', 'View Link')}</span>
                </a>
              )}
            </div>

            {/* Map */}
            {activity.location_coords && isLoaded && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {activity.location_name || t('activities.location', 'Location')}
                </h4>
                <div className="rounded-lg overflow-hidden border">
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={activity.location_coords}
                    zoom={15}
                    options={{
                      disableDefaultUI: false,
                      zoomControl: true,
                      mapTypeControl: false,
                      streetViewControl: false,
                      fullscreenControl: true,
                    }}
                  >
                    <Marker position={activity.location_coords} />
                  </GoogleMap>
                </div>
              </div>
            )}

            {/* Description */}
            {activity.description && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">{t('activities.description', 'Description')}</h4>
                <div 
                  className="p-4 rounded-md border bg-muted/30 text-sm prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: activity.description }}
                />
              </div>
            )}

            {/* Class badges */}
            <div className="mb-6">
              <h4 className="font-semibold mb-2">{t('activities.classes', 'Classes')}</h4>
              <div className="flex flex-wrap gap-2">
                {activity.activity_classes && activity.activity_classes.length > 0 ? (
                  activity.activity_classes.map((ac) => (
                    <div 
                      key={ac.class_id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary"
                    >
                      {ac.classes.name}
                    </div>
                  ))
                ) : (
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
                    {t('activities.schoolWide', 'School-Wide')}
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              {onDownload && (
                <Button
                  variant="outline"
                  onClick={() => onDownload(activity)}
                  className="flex-1 sm:flex-none"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {t('activities.addToCalendar', 'Add to calendar')}
                </Button>
              )}
              {isAdmin && onEdit && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onEdit(activity);
                    onOpenChange(false);
                  }}
                  className="flex-1 sm:flex-none"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {t('common.edit', 'Edit')}
                </Button>
              )}
              {isAdmin && onDelete && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onDelete(activity);
                    onOpenChange(false);
                  }}
                  className="flex-1 sm:flex-none text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('common.delete', 'Delete')}
                </Button>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
