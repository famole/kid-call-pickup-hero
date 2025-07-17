import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useSelfCheckoutHistory } from '@/hooks/useSelfCheckoutHistory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Calendar, Clock, MessageSquare, LogOut, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const SelfCheckoutHistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const { historyData, loading } = useSelfCheckoutHistory();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gray-50">
        <div className="container mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                {t('common.back')}
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">{t('selfCheckout.historyTitle')}</h1>
            <p className="text-gray-600">{t('selfCheckout.historyDescription')}</p>
          </div>
          
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-school-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="container mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('common.back')}
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{t('selfCheckout.historyTitle')}</h1>
          <p className="text-gray-600">{t('selfCheckout.historyDescription')}</p>
        </div>

        <div className="space-y-6">
          {/* Self-Checkout Authorizations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogOut className="h-5 w-5" />
                {t('selfCheckout.authorizationsTitle')}
              </CardTitle>
              <CardDescription>
                {t('selfCheckout.authorizationsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyData.authorizations.length === 0 ? (
                <div className="text-center py-8">
                  <LogOut className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">{t('selfCheckout.noAuthorizations')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyData.authorizations.map((auth) => (
                    <div key={auth.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarImage src={auth.student?.avatar} alt={auth.student?.name} />
                          <AvatarFallback className="bg-school-primary text-white">
                            {auth.student?.name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-medium">{auth.student?.name}</h4>
                              <p className="text-sm text-gray-600">
                                {auth.class?.name} - {t('admin.grade')} {auth.class?.grade}
                              </p>
                            </div>
                            
                            <Badge 
                              variant={auth.isActive ? "default" : "secondary"}
                              className={auth.isActive ? "bg-green-600 hover:bg-green-700" : ""}
                            >
                              {auth.isActive ? t('selfCheckout.active') : t('selfCheckout.inactive')}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(auth.startDate)} - {formatDate(auth.endDate)}</span>
                            </div>
                          </div>

                          {/* Show departures for this authorization */}
                          {auth.departures && auth.departures.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <h5 className="text-sm font-medium text-gray-700">{t('selfCheckout.departures')}</h5>
                              {auth.departures.map((departure) => (
                                <div key={departure.id} className="bg-white border rounded p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Clock className="h-4 w-4 text-gray-500" />
                                    <span className="text-sm">{formatDateTime(departure.departedAt)}</span>
                                  </div>
                                  
                                  {departure.notes && (
                                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                      <div className="flex items-start gap-2">
                                        <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                        <div>
                                          <p className="text-sm font-medium text-blue-800 mb-1">{t('selfCheckout.teacherNotes')}</p>
                                          <p className="text-sm text-blue-700">{departure.notes}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pickup Authorizations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('pickup.authorizationsTitle')}
              </CardTitle>
              <CardDescription>
                {t('pickup.authorizationsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyData.pickupAuthorizations.length === 0 ? (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">{t('pickup.noAuthorizations')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyData.pickupAuthorizations.map((auth) => (
                    <div key={auth.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarImage src={auth.student?.avatar} alt={auth.student?.name} />
                          <AvatarFallback className="bg-school-primary text-white">
                            {auth.student?.name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-medium">{auth.student?.name}</h4>
                              <p className="text-sm text-gray-600">
                                {auth.class?.name} - {t('admin.grade')} {auth.class?.grade}
                              </p>
                            </div>
                            
                            <Badge 
                              variant={auth.isActive ? "default" : "secondary"}
                              className={auth.isActive ? "bg-green-600 hover:bg-green-700" : ""}
                            >
                              {auth.isActive ? t('pickup.active') : t('pickup.inactive')}
                            </Badge>
                          </div>

                          <div className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">{t('pickup.authorizedParent')}: </span>
                            {auth.authorizedParent?.name}
                          </div>

                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(auth.startDate)} - {formatDate(auth.endDate)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SelfCheckoutHistoryPage;