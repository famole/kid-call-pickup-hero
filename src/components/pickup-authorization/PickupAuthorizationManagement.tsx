
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getPickupAuthorizationsForParent,
  deletePickupAuthorization,
  PickupAuthorizationWithDetails
} from '@/services/pickupAuthorizationService';
import AddAuthorizationDialog from './AddAuthorizationDialog';
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

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
        title: "Error",
        description: "Failed to load pickup authorizations.",
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
        title: "Success",
        description: "Authorization removed successfully.",
      });
    } catch (error) {
      console.error('Error deleting authorization:', error);
      toast({
        title: "Error",
        description: "Failed to remove authorization.",
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
                Pickup Authorizations
              </CardTitle>
              <CardDescription className="text-sm">
                Manage who can pick up your children and when
              </CardDescription>
            </div>
            <Button 
              onClick={() => setIsAddDialogOpen(true)}
              className="w-full sm:w-auto bg-school-primary hover:bg-school-primary/90"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Authorization
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {authorizations.length === 0 ? (
            <div className="text-center py-8 px-4">
              <Users className="h-16 w-16 sm:h-20 sm:w-20 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">No authorizations yet</h3>
              <p className="text-gray-500 mb-6 text-sm sm:text-base max-w-md mx-auto">
                You haven't created any pickup authorizations. Add one to allow other parents to pick up your children.
              </p>
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                className="w-full sm:w-auto bg-school-primary hover:bg-school-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Authorization
              </Button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {authorizations.map((auth) => (
                <div key={auth.id} className="border rounded-lg p-4 space-y-3 bg-white">
                  <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-start sm:space-y-0">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
                        <h4 className="font-medium text-base truncate">
                          {auth.student?.name || 'Unknown Student'}
                        </h4>
                        <Badge 
                          variant={
                            !auth.isActive ? "secondary" : 
                            isExpired(auth.endDate) ? "destructive" : 
                            isActive(auth.startDate, auth.endDate) ? "default" : "outline"
                          }
                          className={`w-fit ${
                            !auth.isActive ? "" : 
                            isExpired(auth.endDate) ? "" : 
                            isActive(auth.startDate, auth.endDate) ? "bg-school-primary hover:bg-school-primary/90" : ""
                          }`}
                        >
                          {!auth.isActive ? "Inactive" : 
                           isExpired(auth.endDate) ? "Expired" : 
                           isActive(auth.startDate, auth.endDate) ? "Active" : "Scheduled"}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600 break-words">
                          <span className="font-medium">Authorized to:</span>{' '}
                          <span className="block sm:inline mt-1 sm:mt-0">
                            {auth.authorizedParent?.name || 'Unknown Parent'}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500 break-all">
                          {auth.authorizedParent?.email}
                        </p>
                        <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="break-words">
                            {formatDate(auth.startDate)} - {formatDate(auth.endDate)}
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
                            disabled={deletingId === auth.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="ml-2 sm:hidden">Remove</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="mx-4 max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-lg">Remove Authorization</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm">
                              Are you sure you want to remove this pickup authorization for{' '}
                              <strong>{auth.student?.name}</strong>? This will prevent{' '}
                              <strong>{auth.authorizedParent?.name}</strong> from picking up your child.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteAuthorization(auth.id)}
                              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove Authorization
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddAuthorizationDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAuthorizationAdded={loadAuthorizations}
      />
    </div>
  );
};

export default PickupAuthorizationManagement;
