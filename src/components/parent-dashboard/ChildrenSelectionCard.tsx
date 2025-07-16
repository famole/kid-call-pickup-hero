
import React from 'react';
import { Child } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserRound, Users, Heart } from 'lucide-react';
import ChildCard from '@/components/ChildCard';
import { useTranslation } from '@/hooks/useTranslation';

interface ChildWithType extends Child {
  isAuthorized?: boolean;
}

interface ChildrenSelectionCardProps {
  children: ChildWithType[];
  selectedChildren: string[];
  childrenWithActiveRequests: string[];
  isSubmitting: boolean;
  onToggleChildSelection: (studentId: string) => void;
  onRequestPickup: () => void;
}

const ChildrenSelectionCard: React.FC<ChildrenSelectionCardProps> = ({
  children,
  selectedChildren,
  childrenWithActiveRequests,
  isSubmitting,
  onToggleChildSelection,
  onRequestPickup
}) => {
  const { t } = useTranslation();
  
  // Separate own children from authorized children
  const ownChildren = children.filter(child => !child.isAuthorized);
  const authorizedChildren = children.filter(child => child.isAuthorized);

  return (
    <Card className="h-fit w-full md:w-3/4 mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg sm:text-xl">{t('dashboard.selectChildrenForPickup')}</CardTitle>
        <CardDescription className="text-sm sm:text-base">
          {t('dashboard.chooseWhichChildren')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {children.length === 0 ? (
          <div className="text-center py-8 sm:py-12 text-muted-foreground">
            <UserRound className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-base sm:text-lg">{t('dashboard.noChildrenFound')}</p>
          </div>
        ) : (
          <>
            {/* Selected children count */}
            {selectedChildren.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-blue-800">
                  {t('dashboard.childrenSelected', { 
                    count: selectedChildren.length,
                    plural: selectedChildren.length > 1 ? 's' : ''
                  })}
                </p>
              </div>
            )}
            
            {/* Own Children Section */}
            {ownChildren.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 border-b pb-2">
                  <Heart className="h-4 w-4 text-pink-500" />
                  {t('dashboard.yourChildren')}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {ownChildren.map((child) => {
                    const hasActiveRequest = childrenWithActiveRequests.includes(child.id);
                    return (
                      <ChildCard
                        key={child.id}
                        child={child}
                        isSelected={selectedChildren.includes(child.id)}
                        isDisabled={hasActiveRequest}
                        isAuthorized={false}
                        onClick={() => !hasActiveRequest && onToggleChildSelection(child.id)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Authorized Children Section */}
            {authorizedChildren.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 border-b pb-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  {t('dashboard.authorizedToPickUp')}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {authorizedChildren.map((child) => {
                    const hasActiveRequest = childrenWithActiveRequests.includes(child.id);
                    return (
                      <ChildCard
                        key={child.id}
                        child={child}
                        isSelected={selectedChildren.includes(child.id)}
                        isDisabled={hasActiveRequest}
                        isAuthorized={true}
                        onClick={() => !hasActiveRequest && onToggleChildSelection(child.id)}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Action button */}
        <div className="pt-4 border-t">
          <Button 
            className="w-full h-12 text-base font-medium bg-school-secondary hover:bg-school-secondary/90 disabled:opacity-50"
            disabled={isSubmitting || selectedChildren.length === 0}
            onClick={onRequestPickup}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white mr-2"></div>
                {t('dashboard.processing')}
              </>
            ) : selectedChildren.length > 0 ? (
              t('dashboard.requestPickupFor', { 
                count: selectedChildren.length,
                plural: selectedChildren.length > 1 ? 'ren' : ''
              })
            ) : (
              t('dashboard.selectChildrenFirst')
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChildrenSelectionCard;
