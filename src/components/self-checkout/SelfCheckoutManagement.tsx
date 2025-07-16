
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Clock, User, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import {
  getActiveSelfCheckoutAuthorizations,
  markStudentDeparture,
  getRecentDepartures,
  SelfCheckoutAuthorizationWithDetails,
  StudentDepartureWithDetails
} from '@/services/selfCheckoutService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import MarkDepartureDialog from './MarkDepartureDialog';

const SelfCheckoutManagement: React.FC = () => {
  const [authorizations, setAuthorizations] = useState<SelfCheckoutAuthorizationWithDetails[]>([]);
  const [departures, setDepartures] = useState<StudentDepartureWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [departuresLoading, setDeparturesLoading] = useState(true);
  const [isMarkDepartureOpen, setIsMarkDepartureOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<SelfCheckoutAuthorizationWithDetails | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

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
        title: t('common.error'),
        description: t('selfCheckout.failedToLoad'),
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
        title: t('common.error'),
        description: t('selfCheckout.failedToLoad'),
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
    loadAuthorizations();
    toast({
      title: t('common.success'),
      description: t('selfCheckout.studentMarkedDeparted'),
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  const formatDateTime = (date: Date) => {
    return `${formatDate(date)} at ${formatTime(date)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">{t('selfCheckout.management')}</h2>
          <p className="text-base sm:text-lg text-muted-foreground">{t('selfCheckout.manageAuthorizations')}</p>
        </div>
      </div>

      <Tabs defaultValue="authorized" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="authorized" className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            {t('selfCheckout.authorizedStudents')} ({authorizations.length})
          </TabsTrigger>
          <TabsTrigger value="departures" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {t('selfCheckout.recentDepartures')} ({departures.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="authorized" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogOut className="h-5 w-5" />
                {t('selfCheckout.authorizedStudents')}
              </CardTitle>
              <CardDescription>
                {t('selfCheckout.studentsAuthorizedForSelfCheckout')}
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('selfCheckout.noAuthorizedStudents')}</h3>
                  <p className="text-gray-500">{t('selfCheckout.noAuthorizedStudentsDescription')}</p>
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
                            {authorization.student?.name || t('selfCheckout.unknownStudent')}
                          </div>
                          <div className="text-sm text-gray-500">
                            {authorization.class?.name || t('selfCheckout.unknownClass')} - {authorization.class?.grade || t('selfCheckout.unknownClass')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {t('selfCheckout.authorizationPeriod')}: {new Date(authorization.endDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleMarkDeparture(authorization)}
                        className="bg-school-primary hover:bg-school-primary/90"
                        size="sm"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        {t('selfCheckout.markDeparture')}
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
                {t('selfCheckout.recentDepartures')}
              </CardTitle>
              <CardDescription>
                {t('selfCheckout.studentsWhoHaveRecentlyLeft')}
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('selfCheckout.noRecentDepartures')}</h3>
                  <p className="text-gray-500">{t('selfCheckout.noRecentDeparturesDescription')}</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('selfCheckout.student')}</TableHead>
                        <TableHead>{t('selfCheckout.class')}</TableHead>
                        <TableHead>{t('selfCheckout.checkoutDateTime')}</TableHead>
                        <TableHead>{t('selfCheckout.markedBy')}</TableHead>
                        <TableHead>{t('selfCheckout.status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departures.map((departure) => (
                        <TableRow key={departure.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={departure.student?.avatar} alt={departure.student?.name} />
                                <AvatarFallback className="bg-school-primary text-white">
                                  {departure.student?.name?.charAt(0) || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="font-medium text-gray-900">
                                {departure.student?.name || t('selfCheckout.unknownStudent')}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-gray-900">
                                {departure.class?.name || t('selfCheckout.unknownClass')}
                              </div>
                              {departure.class?.grade && (
                                <div className="text-sm text-gray-500">
                                  Grade {departure.class.grade}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-gray-500" />
                              <div>
                                <div className="font-medium">{formatDateTime(departure.departedAt)}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {departure.markedByUser && (
                              <div className="flex items-center gap-2 text-sm">
                                <User className="h-4 w-4 text-gray-500" />
                                <span>{departure.markedByUser.name}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              {t('selfCheckout.departed')}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
