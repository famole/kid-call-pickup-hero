
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Clock, User, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getActiveSelfCheckoutAuthorizations,
  markStudentDeparture,
  getRecentDepartures,
  SelfCheckoutAuthorizationWithDetails,
  StudentDepartureWithDetails
} from '@/services/selfCheckoutService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MarkDepartureDialog from './MarkDepartureDialog';

const SelfCheckoutManagement: React.FC = () => {
  const [authorizations, setAuthorizations] = useState<SelfCheckoutAuthorizationWithDetails[]>([]);
  const [departures, setDepartures] = useState<StudentDepartureWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [departuresLoading, setDeparturesLoading] = useState(true);
  const [isMarkDepartureOpen, setIsMarkDepartureOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<SelfCheckoutAuthorizationWithDetails | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([loadAuthorizations(), loadDepartures()]);
  };

  const loadAuthorizations = async () => {
    try {
      setLoading(true);
      const data = await getActiveSelfCheckoutAuthorizations();
      setAuthorizations(data);
    } catch (error) {
      console.error('Error loading authorizations:', error);
      toast({
        title: "Error",
        description: "Failed to load self-checkout authorizations.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDepartures = async () => {
    try {
      setDeparturesLoading(true);
      const data = await getRecentDepartures(20);
      setDepartures(data);
    } catch (error) {
      console.error('Error loading departures:', error);
      toast({
        title: "Error",
        description: "Failed to load recent departures.",
        variant: "destructive",
      });
    } finally {
      setDeparturesLoading(false);
    }
  };

  const handleMarkDeparture = (authorization: SelfCheckoutAuthorizationWithDetails) => {
    setSelectedStudent(authorization);
    setIsMarkDepartureOpen(true);
  };

  const handleDepartureMarked = () => {
    loadDepartures();
    toast({
      title: "Success",
      description: "Student departure marked successfully.",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Self-Checkout Management</h2>
          <p className="text-base sm:text-lg text-muted-foreground">Manage student self-checkout authorizations and departures</p>
        </div>
      </div>

      <Tabs defaultValue="authorized" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="authorized" className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Authorized Students ({authorizations.length})
          </TabsTrigger>
          <TabsTrigger value="departures" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Recent Departures
          </TabsTrigger>
        </TabsList>

        <TabsContent value="authorized" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogOut className="h-5 w-5" />
                Students Authorized for Self-Checkout
              </CardTitle>
              <CardDescription>
                Students who are currently authorized to leave school independently
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      <div className="h-12 w-12 rounded-full bg-gray-200 animate-pulse" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-48 bg-gray-200 animate-pulse rounded" />
                        <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : authorizations.length === 0 ? (
                <div className="text-center py-8">
                  <LogOut className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Authorized Students</h3>
                  <p className="text-gray-500">There are currently no students authorized for self-checkout.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {authorizations.map((authorization) => (
                    <div key={authorization.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={authorization.student?.avatar} alt={authorization.student?.name} />
                          <AvatarFallback className="bg-school-primary text-white">
                            {authorization.student?.name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-gray-900">
                            {authorization.student?.name || 'Unknown Student'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {authorization.class?.name || 'No Class'} - {authorization.class?.grade || 'Unknown Grade'}
                          </div>
                          <div className="text-xs text-gray-500">
                            Authorized until {new Date(authorization.endDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleMarkDeparture(authorization)}
                        className="bg-school-primary hover:bg-school-primary/90"
                        size="sm"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Mark Departure
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departures" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Recent Student Departures
              </CardTitle>
              <CardDescription>
                Students who have recently left the school through self-checkout
              </CardDescription>
            </CardHeader>
            <CardContent>
              {departuresLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      <div className="h-12 w-12 rounded-full bg-gray-200 animate-pulse" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-48 bg-gray-200 animate-pulse rounded" />
                        <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : departures.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Departures</h3>
                  <p className="text-gray-500">No students have left through self-checkout recently.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {departures.map((departure) => (
                    <div key={departure.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={departure.student?.avatar} alt={departure.student?.name} />
                          <AvatarFallback className="bg-school-primary text-white">
                            {departure.student?.name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-gray-900">
                            {departure.student?.name || 'Unknown Student'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {departure.class?.name || 'No Class'} - {departure.class?.grade || 'Unknown Grade'}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            Left at {formatTime(departure.departedAt)} on {formatDate(departure.departedAt)}
                          </div>
                          {departure.markedByUser && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <User className="h-3 w-3" />
                              Marked by {departure.markedByUser.name}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Departed
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <MarkDepartureDialog
        student={selectedStudent}
        isOpen={isMarkDepartureOpen}
        onOpenChange={setIsMarkDepartureOpen}
        onDepartureMarked={handleDepartureMarked}
      />
    </div>
  );
};

export default SelfCheckoutManagement;
