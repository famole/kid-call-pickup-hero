
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
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Pickup Authorizations
            </CardTitle>
            <CardDescription>
              Manage who can pick up your children and when
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Authorization
          </Button>
        </CardHeader>
        <CardContent>
          {authorizations.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No authorizations yet</h3>
              <p className="text-gray-500 mb-4">
                You haven't created any pickup authorizations. Add one to allow other parents to pick up your children.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Authorization
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {authorizations.map((auth) => (
                <div key={auth.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">
                          {auth.student?.name || 'Unknown Student'}
                        </h4>
                        <Badge 
                          variant={
                            !auth.isActive ? "secondary" : 
                            isExpired(auth.endDate) ? "destructive" : 
                            isActive(auth.startDate, auth.endDate) ? "default" : "outline"
                          }
                        >
                          {!auth.isActive ? "Inactive" : 
                           isExpired(auth.endDate) ? "Expired" : 
                           isActive(auth.startDate, auth.endDate) ? "Active" : "Scheduled"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        Authorized to: <span className="font-medium">
                          {auth.authorizedParent?.name || 'Unknown Parent'} ({auth.authorizedParent?.email})
                        </span>
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(auth.startDate)} - {formatDate(auth.endDate)}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={deletingId === auth.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Authorization</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove this pickup authorization for{' '}
                              <strong>{auth.student?.name}</strong>? This will prevent{' '}
                              <strong>{auth.authorizedParent?.name}</strong> from picking up your child.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteAuthorization(auth.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
