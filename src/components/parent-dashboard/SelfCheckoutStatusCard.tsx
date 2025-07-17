import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Clock, MessageSquare, Calendar, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';

interface SelfCheckoutStudent {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatar?: string;
  className: string;
  classGrade: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  departedAt?: Date;
  notes?: string;
}

interface SelfCheckoutStatusCardProps {
  selfCheckoutStudents: SelfCheckoutStudent[];
  loading: boolean;
}

const SelfCheckoutStatusCard: React.FC<SelfCheckoutStatusCardProps> = ({
  selfCheckoutStudents,
  loading
}) => {
  const { t } = useTranslation();

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <LogOut className="h-5 w-5" />
            {t('selfCheckout.title')}
          </CardTitle>
          <CardDescription className="text-sm">
            {t('selfCheckout.statusDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-school-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (selfCheckoutStudents.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <LogOut className="h-5 w-5" />
            {t('selfCheckout.title')}
          </CardTitle>
          <CardDescription className="text-sm">
            {t('selfCheckout.statusDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <LogOut className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">{t('selfCheckout.noActiveAuthorizations')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <LogOut className="h-5 w-5" />
          {t('selfCheckout.title')} ({selfCheckoutStudents.length})
        </CardTitle>
        <CardDescription className="text-sm">
          {t('selfCheckout.statusDescription')}
        </CardDescription>
        <div className="flex justify-end">
          <Link
            to="/self-checkout-history"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            {t('selfCheckout.viewAll')}
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {selfCheckoutStudents.map((student) => (
            <div key={student.id} className="border rounded-lg p-3 bg-gray-50">
              <div className="flex items-start space-x-3">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={student.studentAvatar} alt={student.studentName} />
                  <AvatarFallback className="bg-school-primary text-white text-sm">
                    {student.studentName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm truncate">{student.studentName}</h4>
                      <p className="text-xs text-gray-600">
                        {student.className} - {t('admin.grade')} {student.classGrade}
                      </p>
                    </div>
                    
                    <Badge 
                      variant={student.departedAt ? "secondary" : student.isActive ? "default" : "outline"}
                      className={`text-xs ${
                        student.departedAt ? "" : 
                        student.isActive ? "bg-green-600 hover:bg-green-700" : ""
                      }`}
                    >
                      {student.departedAt ? t('selfCheckout.departed') : 
                       student.isActive ? t('selfCheckout.active') : t('selfCheckout.inactive')}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(student.startDate)} - {formatDate(student.endDate)}</span>
                  </div>

                  {student.departedAt && (
                    <div className="flex items-center gap-1 text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                      <Clock className="h-3 w-3" />
                      <span>{t('selfCheckout.departedAt')} {formatTime(student.departedAt)}</span>
                    </div>
                  )}

                  {student.notes && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-2">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-blue-800 mb-1">{t('selfCheckout.teacherNotes')}</p>
                          <p className="text-xs text-blue-700">{student.notes}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SelfCheckoutStatusCard;