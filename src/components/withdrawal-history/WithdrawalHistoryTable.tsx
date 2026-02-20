import React, { useState, useEffect } from 'react';
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
  year: number;
  month: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
}

const MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

const WithdrawalHistoryTable: React.FC<WithdrawalHistoryTableProps> = ({
  data, loading = false, year, month, onYearChange, onMonthChange
}) => {
  const { t } = useTranslation();
  const [selectedRecord, setSelectedRecord] = useState<WithdrawalRecord | null>(null);
  const [studentFilter, setStudentFilter] = useState<string>('all');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get unique students for filter
  const uniqueStudents = Array.from(
    new Set(data.map(record => record.studentName))
  ).sort();

  // Filter data based on selected student
  const filteredData = studentFilter === 'all' 
    ? data 
    : data.filter(record => record.studentName === studentFilter);

  const getMonthName = (m: number) => t(`withdrawal.months.${m}`);

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

  const getTypeText = (type: string) => {
    switch (type) {
      case 'self_pickup':
        return t('withdrawal.selfPickup');
      case 'authorized_pickup':
        return t('withdrawal.authorizedPickup');
      case 'self_checkout':
        return t('withdrawal.selfCheckout');
      default:
        return t('withdrawal.unknown');
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
        <CardContent className="pt-6">
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isMobile) {
    // Mobile-optimized layout without container box
    return (
      <div className="space-y-3">
        {/* Filters row */}
        <div className="grid grid-cols-3 gap-2">
          <Select value={String(month)} onValueChange={v => onMonthChange(Number(v))}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map(m => (
                <SelectItem key={m} value={String(m)}>{getMonthName(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => onYearChange(Number(v))}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={studentFilter} onValueChange={setStudentFilter}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={t('withdrawal.filterByStudent')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('withdrawal.allStudents')}</SelectItem>
              {uniqueStudents.map((studentName) => (
                <SelectItem key={studentName} value={studentName}>{studentName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="text-xs text-muted-foreground">{filteredData.length} {t('withdrawal.records')}</p>

        {filteredData.length === 0 ? (
          <div className="text-center py-8 px-2">
            <LogOut className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('withdrawal.noRecords')}</p>
          </div>
        ) : (
          <>

            {/* Compact table for mobile - no container, remove avatars for space */}
            <div className="overflow-x-auto -mx-2">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium text-xs">{t('withdrawal.student')}</th>
                    <th className="text-left p-2 font-medium text-xs">{t('withdrawal.type')}</th>
                    <th className="text-left p-2 font-medium text-xs">{t('withdrawal.responsiblePerson')}</th>
                    <th className="text-left p-2 font-medium text-xs">{t('withdrawal.date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((record) => (
                    <tr 
                      key={`${record.type}-${record.id}`}
                      className="border-b hover:bg-muted/30 cursor-pointer"
                      onClick={() => setSelectedRecord(record)}
                    >
                      <td className="p-2 text-xs font-medium truncate max-w-24">{record.studentName}</td>
                      <td className="p-2 text-xs">
                        {/* Simple text instead of badges to save space */}
                        <span className="text-xs px-1 py-0.5 bg-muted rounded text-muted-foreground">
                          {getTypeText(record.type)}
                        </span>
                      </td>
                      <td className="p-2 text-xs truncate max-w-20">{getResponsiblePerson(record)}</td>
                      <td className="p-2 text-xs">{format(record.date, 'MM/dd HH:mm')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

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

                {/* Details Grid */}
                <div className="grid grid-cols-1 gap-4">
                  {/* Withdrawal Type */}
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">{t('withdrawal.type')}</h4>
                    <div>{getTypeBadge(selectedRecord.type)}</div>
                  </div>

                  {/* Responsible Person */}
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">{t('withdrawal.responsiblePerson')}</h4>
                    <p className="text-sm font-medium">{getResponsiblePerson(selectedRecord)}</p>
                  </div>

                  {/* Date */}
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">{t('withdrawal.date')}</h4>
                    <p className="text-sm font-medium">{format(selectedRecord.date, 'MMM d, yyyy HH:mm')}</p>
                  </div>

                  {/* Notes */}
                  {selectedRecord.notes && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">{t('withdrawal.notes')}</h4>
                      <p className="text-sm bg-muted/50 p-3 rounded-lg font-medium">{selectedRecord.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Desktop layout with card container
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground mr-auto">
            {filteredData.length} {t('withdrawal.records')}
          </span>
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={String(month)} onValueChange={v => onMonthChange(Number(v))}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map(m => (
                <SelectItem key={m} value={String(m)}>{getMonthName(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => onYearChange(Number(v))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={studentFilter} onValueChange={setStudentFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t('withdrawal.filterByStudent')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('withdrawal.allStudents')}</SelectItem>
              {uniqueStudents.map((studentName) => (
                <SelectItem key={studentName} value={studentName}>{studentName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredData.length === 0 ? (
          <div className="text-center py-8">
            <LogOut className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('withdrawal.noRecords')}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">{t('withdrawal.student')}</TableHead>
                    <TableHead className="w-[150px]">{t('withdrawal.type')}</TableHead>
                    <TableHead className="w-[180px]">{t('withdrawal.responsiblePerson')}</TableHead>
                    <TableHead className="w-[160px]">{t('withdrawal.date')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((record) => (
                    <TableRow 
                      key={`${record.type}-${record.id}`}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedRecord(record)}
                    >
                      <TableCell className="w-[250px]">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={record.studentAvatar} alt={record.studentName} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {record.studentName?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium truncate">{record.studentName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="w-[150px]">
                        <div className="flex justify-start">
                          {getTypeBadge(record.type)}
                        </div>
                      </TableCell>
                      <TableCell className="w-[180px]">
                        <span className="truncate block">{getResponsiblePerson(record)}</span>
                      </TableCell>
                      <TableCell className="w-[160px]">
                        <span className="text-sm">{format(record.date, 'MMM d, yyyy HH:mm')}</span>
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

              {/* Details Grid */}
              <div className="grid grid-cols-3 gap-4">
                {/* Withdrawal Type */}
                <div className="col-span-3">
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">{t('withdrawal.type')}</h4>
                  <div>{getTypeBadge(selectedRecord.type)}</div>
                </div>

                {/* Responsible Person */}
                <div className="col-span-3">
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">{t('withdrawal.responsiblePerson')}</h4>
                  <p className="text-sm font-medium">{getResponsiblePerson(selectedRecord)}</p>
                </div>

                {/* Date */}
                <div className="col-span-3">
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">{t('withdrawal.date')}</h4>
                  <p className="text-sm font-medium">{format(selectedRecord.date, 'MMM d, yyyy HH:mm')}</p>
                </div>

                {/* Notes */}
                {selectedRecord.notes && (
                  <div className="col-span-3">
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">{t('withdrawal.notes')}</h4>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg font-medium">{selectedRecord.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default WithdrawalHistoryTable;