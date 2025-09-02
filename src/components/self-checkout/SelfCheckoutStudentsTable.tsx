
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, Calendar, Clock } from 'lucide-react';
import { SelfCheckoutAuthorizationWithDetails } from '@/services/selfCheckoutService';
import { Skeleton } from '@/components/ui/skeleton';
import MarkDepartureDialog from './MarkDepartureDialog';
import { getTodayDepartureForStudent } from '@/services/selfCheckoutService';
import { useTranslation } from '@/hooks/useTranslation';
import { logger } from '@/utils/logger';

interface SelfCheckoutStudentsTableProps {
  authorizations: SelfCheckoutAuthorizationWithDetails[];
  loading: boolean;
}

interface StudentDeparture {
  studentId: string;
  departedAt: Date;
}

const SelfCheckoutStudentsTable: React.FC<SelfCheckoutStudentsTableProps> = ({
  authorizations,
  loading
}) => {
  const { t } = useTranslation();
  const [selectedStudent, setSelectedStudent] = useState<SelfCheckoutAuthorizationWithDetails | null>(null);
  const [isMarkDepartureOpen, setIsMarkDepartureOpen] = useState(false);
  const [todayDepartures, setTodayDepartures] = useState<StudentDeparture[]>([]);
  const [departuresLoading, setDeparturesLoading] = useState(false);

  useEffect(() => {
    if (authorizations.length > 0) {
      loadTodayDepartures();
    }
  }, [authorizations]);

  const loadTodayDepartures = async () => {
    try {
      setDeparturesLoading(true);
      const departures: StudentDeparture[] = [];
      
      for (const auth of authorizations) {
        if (auth.student?.id) {
          const departure = await getTodayDepartureForStudent(auth.student.id);
          if (departure) {
            departures.push({
              studentId: auth.student.id,
              departedAt: departure.departedAt
            });
          }
        }
      }
      
      setTodayDepartures(departures);
    } catch (error) {
      logger.error('Error loading today departures:', error);
    } finally {
      setDeparturesLoading(false);
    }
  };

  const handleMarkDeparture = (authorization: SelfCheckoutAuthorizationWithDetails) => {
    setSelectedStudent(authorization);
    setIsMarkDepartureOpen(true);
  };

  const handleDepartureMarked = () => {
    // Refresh the departure data
    loadTodayDepartures();
  };

  const getStudentDeparture = (studentId: string): StudentDeparture | undefined => {
    return todayDepartures.find(dep => dep.studentId === studentId);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            {t('selfCheckout.authorizedStudents')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (authorizations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            {t('selfCheckout.authorizedStudents')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <LogOut className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('selfCheckout.noAuthorizedStudents')}</h3>
            <p className="text-gray-500">{t('selfCheckout.noAuthorizedStudentsDescription')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            {t('selfCheckout.authorizedStudents')} ({authorizations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">{t('selfCheckout.student')}</TableHead>
                  <TableHead className="text-left">{t('selfCheckout.class')}</TableHead>
                  <TableHead className="text-left">{t('selfCheckout.authorizingParent')}</TableHead>
                  <TableHead className="text-left">{t('selfCheckout.authorizationPeriod')}</TableHead>
                  <TableHead className="text-left">{t('selfCheckout.status')}</TableHead>
                  <TableHead className="text-left">{t('selfCheckout.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {authorizations.map((authorization) => {
                  const studentDeparture = authorization.student?.id ? getStudentDeparture(authorization.student.id) : undefined;
                  const hasLeftToday = !!studentDeparture;

                  return (
                    <TableRow key={authorization.id}>
                      <TableCell className="text-left">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={authorization.student?.avatar} alt={authorization.student?.name} />
                            <AvatarFallback className="bg-school-primary text-white">
                              {authorization.student?.name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-gray-900">
                              {authorization.student?.name || t('selfCheckout.unknownStudent')}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-left">
                        <div>
                          <div className="font-medium text-gray-900">
                            {authorization.class?.name || t('selfCheckout.unknownClass')}
                          </div>
                          {authorization.class?.grade && (
                            <div className="text-sm text-gray-500">
                              {t('admin.grade')} {authorization.class.grade}
                            </div>
                          )}
                          {authorization.class?.teacher && (
                            <div className="text-sm text-gray-500">
                              {authorization.class.teacher}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="font-medium text-gray-900">
                          {authorization.authorizingParent?.name || t('pickupAuthorizations.unknownParent')}
                        </div>
                        {authorization.authorizingParent?.email && (
                          <div className="text-sm text-gray-500">
                            {authorization.authorizingParent.email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <div>
                            <div>{new Date(authorization.startDate).toLocaleDateString()}</div>
                            <div className="text-xs text-gray-500">
                              to {new Date(authorization.endDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-left">
                        <Badge 
                          variant={authorization.isActive && !hasLeftToday ? "default" : "secondary"}
                          className={authorization.isActive && !hasLeftToday ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                          {hasLeftToday ? t('selfCheckout.departedToday') : authorization.isActive ? t('selfCheckout.active') : t('selfCheckout.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-left">
                        {departuresLoading ? (
                          <Skeleton className="h-9 w-32" />
                        ) : hasLeftToday ? (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="h-4 w-4" />
                            <div>
                              <div className="font-medium">{t('selfCheckout.departedAt')}</div>
                              <div className="text-xs">
                                {formatTime(studentDeparture.departedAt)}
                              </div>
                            </div>
                          </div>
                        ) : authorization.isActive ? (
                          <Button
                            onClick={() => handleMarkDeparture(authorization)}
                            size="sm"
                            className="bg-school-primary hover:bg-school-primary/90"
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            {t('selfCheckout.markDeparture')}
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <MarkDepartureDialog
        student={selectedStudent}
        isOpen={isMarkDepartureOpen}
        onOpenChange={setIsMarkDepartureOpen}
        onDepartureMarked={handleDepartureMarked}
      />
    </>
  );
};

export default SelfCheckoutStudentsTable;
