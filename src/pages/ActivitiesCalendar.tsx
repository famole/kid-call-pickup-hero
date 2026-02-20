import { useState } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, startOfYear, endOfYear } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar, Trash2, Edit, Download, ExternalLink, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActivityFormDialog } from '@/components/activities/ActivityFormDialog';
import { ActivityDetailModal } from '@/components/activities/ActivityDetailModal';
import { useActivities, useDeleteActivity } from '@/hooks/useActivities';
import { useMyClasses } from '@/hooks/useMyClasses';
import { useAuth } from '@/context/AuthContext';
import { SchoolActivity } from '@/services/activitiesService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Class } from '@/types';
import Navigation from '@/components/Navigation';
import { useTranslation } from 'react-i18next';
import { useDeleteConfirmation } from '@/hooks/useDeleteConfirmation';
import DeleteConfirmationDialog from '@/components/ui/delete-confirmation-dialog';
import { downloadActivityAsICS } from '@/utils/calendarExport';

export default function ActivitiesCalendar() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedActivity, setSelectedActivity] = useState<SchoolActivity | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  
  const { data: classes = [], isLoading: isLoadingClasses } = useMyClasses() as { data: Class[]; isLoading: boolean };
  const deleteActivityMutation = useDeleteActivity();

  const deleteConfirmation = useDeleteConfirmation<SchoolActivity>({
    onDelete: async (activity) => {
      await deleteActivityMutation.mutateAsync(activity.id);
    },
    getItemName: (activity) => activity.title,
    getConfirmationText: (activity) => ({
      title: t('activities.deleteConfirmation', 'Delete Activity'),
      description: t('activities.deleteDescription', 'Are you sure you want to delete this activity? This action cannot be undone.'),
    }),
  });

  const startDate = viewMode === 'month' 
    ? format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    : format(startOfYear(currentMonth), 'yyyy-MM-dd');
  const endDate = viewMode === 'month'
    ? format(endOfMonth(currentMonth), 'yyyy-MM-dd')
    : format(endOfYear(currentMonth), 'yyyy-MM-dd');

  const classFilter = selectedClassId === 'all' 
    ? undefined 
    : selectedClassId === 'school-wide' 
    ? null 
    : selectedClassId;

  const { data: activities, isLoading } = useActivities(startDate, endDate, classFilter);

  const isAdmin = user?.role === 'admin';

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleCreateActivity = () => {
    setSelectedActivity(null);
    setIsDialogOpen(true);
  };

  const handleEditActivity = (activity: SchoolActivity) => {
    setSelectedActivity(activity);
    setIsDialogOpen(true);
  };

  const handleViewActivity = (activity: SchoolActivity) => {
    setSelectedActivity(activity);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="min-h-screen w-full bg-muted/50">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-4 mb-8 items-center sm:items-stretch">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            {viewMode === 'month' && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePreviousMonth}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl sm:text-3xl font-bold text-center">
                  {format(currentMonth, 'MMMM yyyy')}
                </h1>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextMonth}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
            {viewMode === 'year' && (
              <h1 className="text-2xl sm:text-3xl font-bold text-center">
                {format(currentMonth, 'yyyy')} {t('activities.yearActivities', 'Activities')}
              </h1>
            )}
          </div>
          {isAdmin && (
            <Button onClick={handleCreateActivity}>
              <Plus className="h-4 w-4 mr-2" />
              {t('activities.createActivity', 'Create Activity')}
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Select value={viewMode} onValueChange={(value: 'month' | 'year') => setViewMode(value)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">{t('activities.monthlyView', 'Monthly View')}</SelectItem>
              <SelectItem value="year">{t('activities.yearView', 'Year View')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t('activities.filterByClass', 'Filter by class')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('activities.allActivities', 'All Activities')}</SelectItem>
              <SelectItem value="school-wide">{t('activities.schoolWideOnly', 'School-Wide Only')}</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {(isLoading || isLoadingClasses) ? (
        <div className="text-center py-12 text-muted-foreground">
          {t('common.loading', 'Loading activities...')}
        </div>
      ) : activities && activities.length > 0 ? (
        <div className="flex flex-col gap-4">
          {activities.map((activity) => (
            <div 
              key={activity.id} 
              className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border bg-card hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleViewActivity(activity)}
            >
              {/* Image */}
              <div className="flex-shrink-0 w-20 h-20 sm:w-32 sm:h-32 rounded-md overflow-hidden bg-muted">
                {activity.image_url ? (
                  <img 
                    src={activity.image_url} 
                    alt={activity.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Calendar className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground/40" />
                  </div>
                )}
              </div>

              {/* Activity details */}
              <div className="flex-grow min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-grow min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold line-clamp-2">{activity.title}</h3>
                    {activity.link && (
                      <a
                        href={activity.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden sm:inline-flex items-center gap-1 text-xs text-primary hover:underline flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                        {t('activities.viewLink', 'Ver Enlace')}
                      </a>
                    )}
                  </div>

                  {/* Quick actions - only on desktop */}
                  <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                    {isAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditActivity(activity);
                          }}
                          title={t('common.edit', 'Edit')}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConfirmation.openDeleteConfirmation(activity);
                          }}
                          title={t('common.delete', 'Delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadActivityAsICS(activity);
                      }}
                      title={t('activities.addToCalendar', 'Add to calendar')}
                    >
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Date, time, location */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>{format(new Date(activity.activity_date), 'd MMM yyyy')}</span>
                  </div>
                  {activity.activity_time && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>{activity.activity_time}</span>
                    </div>
                  )}
                  {activity.location_name && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="line-clamp-1">{activity.location_name}</span>
                    </div>
                  )}
                </div>

                {/* Description - only on desktop */}
                {activity.description && (
                  <div 
                    className="hidden lg:block text-sm text-muted-foreground line-clamp-2 prose prose-sm max-w-none [&>*]:my-0 p-3 rounded border bg-muted/30 text-left"
                    dangerouslySetInnerHTML={{ __html: activity.description }}
                  />
                )}

                {/* Class badges */}
                <div className="hidden sm:flex flex-wrap gap-1">
                  {activity.activity_classes && activity.activity_classes.length > 0 ? (
                    activity.activity_classes.slice(0, 3).map((ac) => (
                      <div 
                        key={ac.class_id}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                      >
                        {ac.classes.name}
                      </div>
                    ))
                  ) : (
                    <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {t('activities.schoolWide', 'Toda la Escuela')}
                    </div>
                  )}
                  {activity.activity_classes && activity.activity_classes.length > 3 && (
                    <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                      +{activity.activity_classes.length - 3}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-5xl mb-4">📅✨</span>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {t('activities.noActivitiesTitle', 'No activities yet!')}
          </h3>
          <p className="text-muted-foreground max-w-sm">
            {viewMode === 'month'
              ? t('activities.noActivitiesMonth', 'There are no activities scheduled for this month. Check back soon! 🎉')
              : t('activities.noActivitiesYear', 'There are no activities scheduled for this year. Check back soon! 🎉')}
          </p>
        </div>
      )}

      <ActivityDetailModal
        activity={selectedActivity}
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        onEdit={handleEditActivity}
        onDelete={deleteConfirmation.openDeleteConfirmation}
        onDownload={downloadActivityAsICS}
        isAdmin={isAdmin}
      />

      {isAdmin && (
        <>
          <ActivityFormDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            activity={selectedActivity}
          />
          <DeleteConfirmationDialog
            open={deleteConfirmation.isOpen}
            onOpenChange={deleteConfirmation.closeDeleteConfirmation}
            title={deleteConfirmation.getDialogTexts().title}
            description={deleteConfirmation.getDialogTexts().description}
            itemName={deleteConfirmation.getItemDisplayName()}
            isLoading={deleteConfirmation.isLoading}
            onConfirm={deleteConfirmation.handleConfirmDelete}
            confirmText={t('common.delete', 'Delete')}
          />
        </>
      )}
      </div>
    </div>
  );
}
