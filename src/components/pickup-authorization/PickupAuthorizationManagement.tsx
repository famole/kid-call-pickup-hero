
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calendar, Users, Plus, Trash2, Edit } from 'lucide-react';
import RoleBadge from './RoleBadge';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { logger } from '@/utils/logger';
import { supabase } from "@/integrations/supabase/client";
import { getCurrentParentIdCached } from '@/services/parent/getCurrentParentId';
import {
  getPickupAuthorizationsForParent,
  deletePickupAuthorization,
  PickupAuthorizationWithDetails
} from '@/services/pickupAuthorizationService';
import {
  getPickupInvitationsForParent,
  deletePickupInvitation,
  PickupInvitationWithDetails
} from '@/services/pickupInvitationService';
import AddAuthorizationDialog from './AddAuthorizationDialog';
import EditAuthorizationDialog from './EditAuthorizationDialog';
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
} from '@/components/ui/alert-dialog';

const PickupAuthorizationManagement: React.FC = () => {
  const [authorizations, setAuthorizations] = useState<PickupAuthorizationWithDetails[]>([]);
  const [invitations, setInvitations] = useState<PickupInvitationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExpired, setShowExpired] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAuthorization, setEditingAuthorization] = useState<PickupAuthorizationWithDetails | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingInvitationId, setDeletingInvitationId] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();
  
  // Refs for managing subscriptions and timeouts
  const subscriptionRef = useRef<any>(null);
  const invitationSubscriptionRef = useRef<any>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);

  // Debounced loading function to prevent excessive API calls
  const loadAuthorizations = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    
    // Prevent excessive calls - only allow one call per 2 seconds unless forced
    if (!forceRefresh && now - lastFetchRef.current < 2000) {
      logger.info('Skipping authorization refresh - too recent');
      return;
    }

    // Clear any pending debounced calls
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    const doLoad = async () => {
      try {
        setLoading(true);
        logger.info('Loading pickup authorizations and invitations');
        const [authData, invitationData] = await Promise.all([
          (async () => {
            const currentParentId = await getCurrentParentIdCached();
            if (!currentParentId) {
              logger.error('PickupAuthorizationManagement: No current parent ID found');
              return [];
            }
            logger.log('PickupAuthorizationManagement: Loading authorizations for parentId:', currentParentId);
            return getPickupAuthorizationsForParent(currentParentId);
          })(),
          getPickupInvitationsForParent()
        ]);
        setAuthorizations(authData);
        setInvitations(invitationData.filter(inv => inv.invitationStatus === 'pending'));
        lastFetchRef.current = now;
        logger.info(`Loaded ${authData.length} authorizations and ${invitationData.length} invitations`);
      } catch (error) {
        logger.error('Error loading authorizations:', error);
        toast({
          title: t('common.error'),
          description: t('pickupAuthorizations.failedToLoad'),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    await doLoad();
  }, [toast, t]);

  // Initial load and setup real-time subscriptions
  useEffect(() => {
    loadAuthorizations(true);

    // Clean up existing subscriptions
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }
    if (invitationSubscriptionRef.current) {
      supabase.removeChannel(invitationSubscriptionRef.current);
    }

    // Set up real-time subscription for pickup_authorizations
    const authChannel = supabase
      .channel(`pickup_authorizations_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pickup_authorizations'
        },
        (payload) => {
          logger.info('Pickup authorization change detected:', payload.eventType);
          // Debounce the refresh to avoid rapid-fire updates
          if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
          }
          debounceTimeoutRef.current = setTimeout(() => {
            loadAuthorizations(true);
          }, 500);
        }
      )
      .subscribe();

    // Set up real-time subscription for pickup_invitations
    const invitationChannel = supabase
      .channel(`pickup_invitations_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pickup_invitations'
        },
        (payload) => {
          logger.info('Pickup invitation change detected:', payload.eventType);
          // Debounce the refresh to avoid rapid-fire updates
          if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
          }
          debounceTimeoutRef.current = setTimeout(() => {
            loadAuthorizations(true);
          }, 500);
        }
      )
      .subscribe();

    subscriptionRef.current = authChannel;
    invitationSubscriptionRef.current = invitationChannel;

    return () => {
      logger.info('Cleaning up pickup authorization subscriptions');
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
      if (invitationSubscriptionRef.current) {
        supabase.removeChannel(invitationSubscriptionRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [loadAuthorizations]);

  const handleDeleteAuthorization = async (id: string) => {
    if (!id) {
      logger.error('No authorization ID provided for deletion');
      toast({
        title: t('common.error'),
        description: 'No authorization selected',
        variant: 'destructive'
      });
      return;
    }

    try {
      setDeletingId(id);
      
      // Get current parent ID
      const currentParentId = await getCurrentParentIdCached();
      if (!currentParentId) {
        logger.error('Failed to get current parent ID');
        toast({
          title: t('common.error'),
          description: 'Authentication error. Please refresh the page and try again.',
          variant: 'destructive'
        });
        return;
      }

      logger.info('Attempting to delete pickup authorization', { id, parentId: currentParentId });
      
      // Delete the authorization
      await deletePickupAuthorization(currentParentId, id);
      
      // Update local state to remove the deleted authorization
      setAuthorizations(prev => prev.filter(auth => auth.id !== id));
      
      // Show success message
      toast({
        title: t('common.success'),
        description: t('pickupAuthorizations.authorizationRemoved'),
      });
      
      logger.info('Successfully deleted pickup authorization', { id });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error deleting authorization:', { error: errorMessage, id });
      
      toast({
        title: t('common.error'),
        description: errorMessage || t('pickupAuthorizations.failedToRemove'),
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteInvitation = async (id: string) => {
    try {
      setDeletingInvitationId(id);
      await deletePickupInvitation(id);
      setInvitations(prev => prev.filter(inv => inv.id !== id));
      toast({
        title: t('common.success'),
        description: t('pickupAuthorizations.invitationRemoved'),
      });
    } catch (error) {
      logger.error('Error deleting invitation:', error);
      toast({
        title: t('common.error'),
        description: t('pickupAuthorizations.failedToRemoveInvitation'),
        variant: "destructive",
      });
    } finally {
      setDeletingInvitationId(null);
    }
  };

  const formatDate = (dateString: string) => {
    // Parse date in local timezone to avoid timezone conversion issues
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString();
  };

  const isExpired = (endDate: string) => {
    // Compare only dates, not times - authorization should be valid through end of day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Parse date in local timezone
    const [year, month, day] = endDate.split('-');
    const end = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    end.setHours(0, 0, 0, 0);
    return end < today;
  };

  const isActive = (startDate: string, endDate: string) => {
    // Compare only dates, not times - authorization should be valid through end of day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Parse dates in local timezone
    const [startYear, startMonth, startDay] = startDate.split('-');
    const start = new Date(parseInt(startYear), parseInt(startMonth) - 1, parseInt(startDay));
    start.setHours(0, 0, 0, 0);
    const [endYear, endMonth, endDay] = endDate.split('-');
    const end = new Date(parseInt(endYear), parseInt(endMonth) - 1, parseInt(endDay));
    end.setHours(0, 0, 0, 0);
    return today >= start && today <= end;
  };

  const isActiveToday = (startDate: string, endDate: string, allowedDaysOfWeek: number[]) => {
    // First check if within date range
    if (!isActive(startDate, endDate)) return false;
    
    // Then check if today's day of week is allowed
    const currentDayOfWeek = new Date().getDay();
    return allowedDaysOfWeek.includes(currentDayOfWeek);
  };

  const getStatusBadge = (startDate: string, endDate: string, isActiveAuth: boolean, allowedDaysOfWeek: number[]) => {
    if (!isActiveAuth) return { label: t('pickupAuthorizations.inactive'), variant: "secondary" as const };
    if (isExpired(endDate)) return { label: t('pickupAuthorizations.expired'), variant: "destructive" as const };
    if (isActive(startDate, endDate)) {
      // Check if today is an allowed day
      if (isActiveToday(startDate, endDate, allowedDaysOfWeek)) {
        return { label: t('pickupAuthorizations.activeToday'), variant: "default" as const };
      } else {
        return { label: t('pickupAuthorizations.activeNotToday'), variant: "outline" as const };
      }
    }
    return { label: t('pickupAuthorizations.scheduled'), variant: "outline" as const };
  };

  const getDayNames = (allowedDays: number[]) => {
    const dayNames = [
      t('common.days.sun'),
      t('common.days.mon'),
      t('common.days.tue'),
      t('common.days.wed'),
      t('common.days.thu'),
      t('common.days.fri'),
      t('common.days.sat')
    ];
    return allowedDays.sort().map(day => dayNames[day]).join(', ');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-school-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
                <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                {t('pickupAuthorizations.title')}
              </CardTitle>
              <CardDescription className="text-sm">
                {t('pickupAuthorizations.description')}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full sm:w-auto">
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-expired"
                  checked={showExpired}
                  onCheckedChange={setShowExpired}
                />
                <Label htmlFor="show-expired" className="text-sm cursor-pointer">
                  {t('pickupAuthorizations.showExpired', 'Show expired')}
                </Label>
              </div>
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                className="w-full sm:w-auto bg-school-primary hover:bg-school-primary/90"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('pickupAuthorizations.addAuthorization')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {authorizations.length === 0 && invitations.length === 0 ? (
            <div className="text-center py-8 px-4">
              <Users className="h-16 w-16 sm:h-20 sm:w-20 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">
                {t('pickupAuthorizations.noAuthorizationsYet')}
              </h3>
              <p className="text-gray-500 mb-6 text-sm sm:text-base max-w-md mx-auto">
                {t('pickupAuthorizations.noAuthorizationsDescription')}
              </p>
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                className="w-full sm:w-auto bg-school-primary hover:bg-school-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('pickupAuthorizations.createFirstAuthorization')}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Pending Invitations Section */}
              {invitations.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                    {t('pickupAuthorizations.pendingInvitations')}
                  </h3>
                  <div className="space-y-3">
                    {invitations.map((invitation) => (
                      <div key={invitation.id} className="border rounded-lg p-4 space-y-3 bg-yellow-50 border-yellow-200">
                        <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-start sm:space-y-0">
                          <div className="space-y-2 flex-1 min-w-0">
                            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
                              <h4 className="font-medium text-base">
                                {invitation.students?.map(s => s.name).join(', ')}
                              </h4>
                              <Badge variant="outline" className="w-fit bg-yellow-100 text-yellow-800 border-yellow-300">
                                {t('pickupAuthorizations.pendingAcceptance')}
                              </Badge>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">{t('pickupAuthorizations.invitedPerson')}:</span>{' '}
                                  <span>
                                    {invitation.invitedName} ({invitation.invitedEmail})
                                  </span>
                                </p>
                                <RoleBadge role={invitation.invitedRole} size="sm" />
                              </div>
                              
                              <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500">
                                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span className="break-words">
                                  {formatDate(invitation.startDate)} - {formatDate(invitation.endDate)}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex justify-end sm:flex-shrink-0">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={deletingInvitationId === invitation.id}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="ml-2 sm:hidden">{t('common.remove')}</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="mx-4 max-w-md">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-lg">
                                    {t('pickupAuthorizations.removeInvitation')}
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-sm">
                                    {t('pickupAuthorizations.removeInvitationConfirm')
                                      .replace('{personName}', invitation.invitedName)}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                                  <AlertDialogCancel className="w-full sm:w-auto">
                                    {t('common.cancel')}
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteInvitation(invitation.id)}
                                    className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {t('pickupAuthorizations.removeInvitationButton')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Authorizations Section */}
              {authorizations.length > 0 && (
                <div className="space-y-4">
                  {invitations.length > 0 && (
                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                      {t('pickupAuthorizations.activeAuthorizations')}
                    </h3>
                  )}
                  <div className="space-y-3 sm:space-y-4">
                    {authorizations
                      .filter(auth => showExpired || !isExpired(auth.endDate))
                      .map((auth) => {
                      const statusBadge = getStatusBadge(auth.startDate, auth.endDate, auth.isActive, auth.allowedDaysOfWeek || [0,1,2,3,4,5,6]);
                      return (
                        <div key={auth.id} className="border rounded-lg p-4 space-y-3 bg-white">
                          <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-start sm:space-y-0">
                            <div className="space-y-2 flex-1 min-w-0">
                              <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
                                <h4 className="font-medium text-base truncate">
                                  {auth.student?.name || t('pickupAuthorizations.unknownStudent')}
                                </h4>
                                <Badge 
                                  variant={statusBadge.variant}
                                  className={`w-fit ${
                                    statusBadge.variant === "default" ? "bg-school-primary hover:bg-school-primary/90" : ""
                                  }`}
                                >
                                  {statusBadge.label}
                                </Badge>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">{t('pickupAuthorizations.createdBy')}:</span>{' '}
                                    <span>
                                      {auth.authorizingParent?.name || t('pickupAuthorizations.unknownParent')}
                                    </span>
                                  </p>
                                </div>
                                
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">{t('pickupAuthorizations.authorizedTo')}:</span>{' '}
                                    <span>
                                      {auth.authorizedParent?.name || t('pickupAuthorizations.unknownParent')}
                                    </span>
                                  </p>
                                  {auth.authorizedParent?.role && (
                                    <RoleBadge role={auth.authorizedParent.role} size="sm" />
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500">
                                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                  <span className="break-words">
                                    {formatDate(auth.startDate)} - {formatDate(auth.endDate)}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500">
                                  <span className="font-medium">{t('pickupAuthorizations.allowedDays')}:</span>
                                  <span className="break-words">
                                    {getDayNames(auth.allowedDaysOfWeek || [0,1,2,3,4,5,6])}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex justify-end sm:flex-shrink-0 space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingAuthorization(auth);
                                  setIsEditDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                                <span className="ml-2 sm:hidden">{t('common.edit')}</span>
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={deletingId === auth.id}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="ml-2 sm:hidden">{t('common.remove')}</span>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="mx-4 max-w-md">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-lg">
                                      {t('pickupAuthorizations.removeAuthorization')}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-sm">
                                      {t('pickupAuthorizations.removeAuthorizationConfirm')
                                        .replace('{studentName}', auth.student?.name || '')
                                        .replace('{parentName}', auth.authorizedParent?.name || '')}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                                    <AlertDialogCancel className="w-full sm:w-auto">
                                      {t('common.cancel')}
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteAuthorization(auth.id)}
                                      className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      {t('pickupAuthorizations.removeAuthorizationButton')}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AddAuthorizationDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAuthorizationAdded={() => loadAuthorizations(true)}
      />
      <EditAuthorizationDialog
        authorization={editingAuthorization}
        isOpen={isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) setEditingAuthorization(null);
          setIsEditDialogOpen(open);
        }}
        onAuthorizationUpdated={() => loadAuthorizations(true)}
      />
    </div>
  );
};

export default PickupAuthorizationManagement;
