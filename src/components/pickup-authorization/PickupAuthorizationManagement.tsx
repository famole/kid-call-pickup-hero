
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, Plus, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import {
  getPickupAuthorizationsForParent,
  deletePickupAuthorization,
  PickupAuthorizationWithDetails
} from '@/services/pickupAuthorizationService';
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
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAuthorization, setEditingAuthorization] = useState<PickupAuthorizationWithDetails | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    loadAuthorizations();
  }, []);

  const loadAuthorizations = async () => {
    try {
      setLoading(true);
      const data = await getPickupAuthorizationsForParent();
      setAuthorizations(data);
    } catch (error) {
      console.error('Error loading authorizations:', error);
      toast({
        title: t('common.error'),
        description: t('pickupAuthorizations.failedToLoad'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAuthorization = async (id: string) => {
    try {
      setDeletingId(id);
      await deletePickupAuthorization(id);
      setAuthorizations(prev => prev.filter(auth => auth.id !== id));
      toast({
        title: t('common.success'),
        description: t('pickupAuthorizations.authorizationRemoved'),
      });
    } catch (error) {
      console.error('Error deleting authorization:', error);
      toast({
        title: t('common.error'),
        description: t('pickupAuthorizations.failedToRemove'),
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isExpired = (endDate: string) => {
    return new Date(endDate) < new Date();
  };

  const isActive = (startDate: string, endDate: string) => {
    const today = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    return today >= start && today <= end;
  };

  const getStatusBadge = (startDate: string, endDate: string, isActiveAuth: boolean) => {
    if (!isActiveAuth) return { label: t('pickupAuthorizations.inactive'), variant: "secondary" as const };
    if (isExpired(endDate)) return { label: t('pickupAuthorizations.expired'), variant: "destructive" as const };
    if (isActive(startDate, endDate)) return { label: t('pickupAuthorizations.active'), variant: "default" as const };
    return { label: t('pickupAuthorizations.scheduled'), variant: "outline" as const };
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
            <Button 
              onClick={() => setIsAddDialogOpen(true)}
              className="w-full sm:w-auto bg-school-primary hover:bg-school-primary/90"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('pickupAuthorizations.addAuthorization')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {authorizations.length === 0 ? (
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
            <div className="space-y-3 sm:space-y-4">
              {authorizations.map((auth) => {
                const statusBadge = getStatusBadge(auth.startDate, auth.endDate, auth.isActive);
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
                          <p className="text-sm text-gray-600 break-words">
                            <span className="font-medium">{t('pickupAuthorizations.createdBy')}:</span>{' '}
                            <span className="block sm:inline mt-1 sm:mt-0">
                              {auth.authorizingParent?.name || t('pickupAuthorizations.unknownParent')}
                            </span>
                          </p>
                          <p className="text-sm text-gray-600 break-words">
                            <span className="font-medium">{t('pickupAuthorizations.authorizedTo')}:</span>{' '}
                            <span className="block sm:inline mt-1 sm:mt-0">
                              {auth.authorizedParent?.name || t('pickupAuthorizations.unknownParent')}
                            </span>
                          </p>
                          <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="break-words">
                              {formatDate(auth.startDate)} - {formatDate(auth.endDate)}
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
          )}
        </CardContent>
      </Card>

      <AddAuthorizationDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAuthorizationAdded={loadAuthorizations}
      />
      <EditAuthorizationDialog
        authorization={editingAuthorization}
        isOpen={isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) setEditingAuthorization(null);
          setIsEditDialogOpen(open);
        }}
        onAuthorizationUpdated={loadAuthorizations}
      />
    </div>
  );
};

export default PickupAuthorizationManagement;
