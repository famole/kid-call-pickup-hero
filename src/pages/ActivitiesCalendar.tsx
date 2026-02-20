import { useState } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, startOfYear, endOfYear, subYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Calendar, Trash2, Edit, Download, ExternalLink, Clock, MapPin, History, Filter } from 'lucide-react';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import PageHeader from '@/components/PageHeader';

export default function ActivitiesCalendar() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedActivity, setSelectedActivity] = useState<SchoolActivity | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [showPast, setShowPast] = useState(false);
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

  const startDate = showPast
    ? format(subYears(new Date(), 1), 'yyyy-MM-dd')
    : viewMode === 'month' 
      ? format(startOfMonth(currentMonth), 'yyyy-MM-dd')
      : format(startOfYear(currentMonth), 'yyyy-MM-dd');
  const endDate = showPast
    ? format(new Date(), 'yyyy-MM-dd')
    : viewMode === 'month'
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
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header with logo + month nav + actions */}
        <PageHeader
          title={
            showPast
              ? t('activities.pastActivities', 'Actividades Pasadas')
              : viewMode === 'month'
              ? (() => {
                  const formatted = format(currentMonth, isMobile ? 'MMM yyyy' : 'MMMM yyyy', { locale: es });
                  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
                })()
              : `${format(currentMonth, 'yyyy')} ${t('activities.yearActivities', 'Activities')}`
          }
          actions={
            <div className="flex items-center gap-1">
              {!showPast && viewMode === 'month' && (
                <>
                  <Button variant="outline" size="icon" onClick={handlePreviousMonth} className="h-7 w-7 sm:h-9 sm:w-9">
                    <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleNextMonth} className="h-7 w-7 sm:h-9 sm:w-9">
                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </>
              )}
              {isAdmin && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {isMobile ? (
                        <Button onClick={handleCreateActivity} size="icon" className="h-7 w-7 sm:h-9 sm:w-9 bg-school-primary hover:bg-school-primary/90">
                          <Plus className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button onClick={handleCreateActivity} className="bg-school-primary hover:bg-school-primary/90">
                          <Plus className="h-4 w-4 mr-2" />
                          {t('activities.createActivity', 'Create Activity')}
                        </Button>
                      )}
                    </TooltipTrigger>
                    {isMobile && (
                      <TooltipContent>{t('activities.createActivity', 'Create Activity')}</TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          }
        />

        {/* Filters row - compact on mobile */}
        <div className="flex items-center gap-2 mb-4 sm:mb-6 overflow-x-auto pb-1">
          {!showPast && (
            <Select value={viewMode} onValueChange={(value: 'month' | 'year') => setViewMode(value)}>
              <SelectTrigger className="min-w-fit shrink-0 sm:w-[180px] h-8 sm:h-9 text-xs sm:text-sm">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">{t('activities.monthlyView', 'Monthly View')}</SelectItem>
                <SelectItem value="year">{t('activities.yearView', 'Year View')}</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="min-w-fit shrink-0 sm:w-[200px] h-8 sm:h-9 text-xs sm:text-sm">
              <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 shrink-0 sm:hidden" />
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

          {isMobile ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showPast ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setShowPast(!showPast)}
                    className="h-8 w-8 flex-shrink-0"
                  >
                    <History className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {showPast ? t('activities.showUpcoming', 'Ver Próximas') : t('activities.showPast', 'Ver Pasadas')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              variant={showPast ? 'default' : 'outline'}
              onClick={() => setShowPast(!showPast)}
              className="gap-2"
            >
              <History className="h-4 w-4" />
              {showPast ? t('activities.showUpcoming', 'Ver Próximas') : t('activities.showPast', 'Ver Pasadas')}
            </Button>
          )}
        </div>

        {/* Activity list */}
        {(isLoading || isLoadingClasses) ? (
          <div className="text-center py-12 text-muted-foreground">
            {t('common.loading', 'Loading activities...')}
          </div>
        ) : activities && activities.length > 0 ? (
          <div className="flex flex-col gap-3 sm:gap-4">
            {activities.map((activity) => (
              <div 
                key={activity.id} 
                className="flex items-start gap-3 p-3 sm:p-4 rounded-lg border bg-card hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleViewActivity(activity)}
              >
                {/* Image */}
                <div className="flex-shrink-0 w-16 h-16 sm:w-32 sm:h-32 rounded-md overflow-hidden bg-muted">
                  {activity.image_url ? (
                    <img 
                      src={activity.image_url} 
                      alt={activity.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Calendar className="h-6 w-6 sm:h-12 sm:w-12 text-muted-foreground/40" />
                    </div>
                  )}
                </div>

                {/* Activity details */}
                <div className="flex-grow min-w-0 space-y-1 sm:space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm sm:text-lg font-semibold line-clamp-2 leading-tight">{activity.title}</h3>

                    {/* Quick actions - desktop only */}
                    <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                      {activity.link && (
                        <a
                          href={activity.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" />
                          {t('activities.viewLink', 'Ver Enlace')}
                        </a>
                      )}
                      {isAdmin && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); handleEditActivity(activity); }}
                            title={t('common.edit', 'Edit')}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); deleteConfirmation.openDeleteConfirmation(activity); }}
                            title={t('common.delete', 'Delete')}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); downloadActivityAsICS(activity); }}
                        title={t('activities.addToCalendar', 'Add to calendar')}>
                        <Calendar className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Date, time, location - compact on mobile */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(activity.activity_date), isMobile ? 'd MMM' : 'd MMM yyyy', { locale: es })}</span>
                    </div>
                    {activity.activity_time && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{activity.activity_time}</span>
                      </div>
                    )}
                    {activity.location_name && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="line-clamp-1">{activity.location_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Description - desktop only */}
                  {activity.description && (
                    <div 
                      className="hidden lg:block text-sm text-muted-foreground line-clamp-2 prose prose-sm max-w-none [&>*]:my-0 p-3 rounded border bg-muted/30 text-left"
                      dangerouslySetInnerHTML={{ __html: activity.description }}
                    />
                  )}

                  {/* Class badges - show 1 on mobile, 3 on desktop */}
                  <div className="flex flex-wrap gap-1">
                    {activity.activity_classes && activity.activity_classes.length > 0 ? (
                      activity.activity_classes.slice(0, isMobile ? 1 : 3).map((ac) => (
                        <div 
                          key={ac.class_id}
                          className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-primary/10 text-primary"
                        >
                          {ac.classes.name}
                        </div>
                      ))
                    ) : (
                      <div className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-primary/10 text-primary">
                        {t('activities.schoolWide', 'Toda la Escuela')}
                      </div>
                    )}
                    {activity.activity_classes && activity.activity_classes.length > (isMobile ? 1 : 3) && (
                      <div className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-muted text-muted-foreground">
                        +{activity.activity_classes.length - (isMobile ? 1 : 3)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
            <span className="text-4xl sm:text-5xl mb-4">📅✨</span>
            <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
              {t('activities.noActivitiesTitle', 'No activities yet!')}
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground max-w-sm">
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
