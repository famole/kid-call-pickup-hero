import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { User, Users, LogOut, Filter } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface WithdrawalRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatar?: string;
  className?: string;
  date: Date;
  type: 'self_pickup' | 'authorized_pickup' | 'self_checkout';
  parentName?: string;
  authorizedParentName?: string;
  notes?: string;
}

interface WithdrawalHistoryTableProps {
  data: WithdrawalRecord[];
  loading?: boolean;
}

const WithdrawalHistoryTable: React.FC<WithdrawalHistoryTableProps> = ({ data, loading = false }) => {
  const { t } = useTranslation();
  const [selectedRecord, setSelectedRecord] = useState<WithdrawalRecord | null>(null);
  const [studentFilter, setStudentFilter] = useState<string>('all');

  // Get unique students for filter
  const uniqueStudents = Array.from(
    new Set(data.map(record => record.studentName))
  ).sort();

  // Filter data based on selected student
  const filteredData = studentFilter === 'all' 
    ? data 
    : data.filter(record => record.studentName === studentFilter);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'self_pickup':
        return <User className="h-4 w-4" />;
      case 'authorized_pickup':
        return <Users className="h-4 w-4" />;
      case 'self_checkout':
        return <LogOut className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'self_pickup':
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
            <User className="h-3 w-3 mr-1" />
            {t('withdrawal.selfPickup')}
          </Badge>
        );
      case 'authorized_pickup':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
            <Users className="h-3 w-3 mr-1" />
            {t('withdrawal.authorizedPickup')}
          </Badge>
        );
      case 'self_checkout':
        return (
          <Badge variant="default" className="bg-purple-100 text-purple-800 hover:bg-purple-200">
            <LogOut className="h-3 w-3 mr-1" />
            {t('withdrawal.selfCheckout')}
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {t('withdrawal.unknown')}
          </Badge>
        );
    }
  };

  const getResponsiblePerson = (record: WithdrawalRecord) => {
    switch (record.type) {
      case 'self_pickup':
        return record.parentName || t('withdrawal.parent');
      case 'authorized_pickup':
        return record.authorizedParentName || t('withdrawal.authorizedParent');
      case 'self_checkout':
        return t('withdrawal.student');
      default:
        return '-';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('withdrawal.historyTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('withdrawal.historyTitle')} ({data.length} {t('withdrawal.records')})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8">
            <LogOut className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('withdrawal.noRecords')}</p>
          </div>
        ) : (
          <>
            {/* Student Filter */}
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={studentFilter} onValueChange={setStudentFilter}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder={t('withdrawal.filterByStudent')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('withdrawal.allStudents')}</SelectItem>
                    {uniqueStudents.map((studentName) => (
                      <SelectItem key={studentName} value={studentName}>
                        {studentName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('withdrawal.student')}</TableHead>
                    <TableHead>{t('withdrawal.type')}</TableHead>
                    <TableHead>{t('withdrawal.responsiblePerson')}</TableHead>
                    <TableHead>{t('withdrawal.date')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((record) => (
                    <TableRow 
                      key={`${record.type}-${record.id}`}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedRecord(record)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={record.studentAvatar} alt={record.studentName} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {record.studentName?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{record.studentName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(record.type)}
                      </TableCell>
                      <TableCell>
                        {getResponsiblePerson(record)}
                      </TableCell>
                      <TableCell>
                        {format(record.date, 'MMM d, yyyy HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>

      {/* Withdrawal Details Modal */}
      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRecord && getTypeIcon(selectedRecord.type)}
              {t('withdrawal.withdrawalDetails')}
            </DialogTitle>
            <DialogDescription>
              {t('withdrawal.detailsDescription')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRecord && (
            <div className="space-y-4">
              {/* Student Information */}
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedRecord.studentAvatar} alt={selectedRecord.studentName} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {selectedRecord.studentName?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{selectedRecord.studentName}</h3>
                  {selectedRecord.className && (
                    <p className="text-sm text-muted-foreground">{selectedRecord.className}</p>
                  )}
                </div>
              </div>

              {/* Withdrawal Type */}
              <div>
                <h4 className="font-medium mb-2">{t('withdrawal.type')}</h4>
                {getTypeBadge(selectedRecord.type)}
              </div>

              {/* Responsible Person */}
              <div>
                <h4 className="font-medium mb-2">{t('withdrawal.responsiblePerson')}</h4>
                <p className="text-sm">{getResponsiblePerson(selectedRecord)}</p>
              </div>

              {/* Date */}
              <div>
                <h4 className="font-medium mb-2">{t('withdrawal.date')}</h4>
                <p className="text-sm">{format(selectedRecord.date, 'MMM d, yyyy HH:mm')}</p>
              </div>

              {/* Notes */}
              {selectedRecord.notes && (
                <div>
                  <h4 className="font-medium mb-2">{t('withdrawal.notes')}</h4>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedRecord.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default WithdrawalHistoryTable;