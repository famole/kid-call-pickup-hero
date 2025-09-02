
import React from 'react';
import { Child } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { getClassById } from '@/services/classService';
import { logger } from '@/utils/logger';
import { UserRound, Check, Users } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface ChildCardProps {
  child: Child;
  isSelected: boolean;
  isDisabled?: boolean;
  isAuthorized?: boolean;
  onClick: () => void;
}

const ChildCard: React.FC<ChildCardProps> = ({ 
  child, 
  isSelected, 
  isDisabled = false, 
  isAuthorized = false,
  onClick 
}) => {
  const { t } = useTranslation();
  const [childClass, setChildClass] = React.useState<any>(null);

  React.useEffect(() => {
    const loadClass = async () => {
      if (child.classId) {
        try {
          const classData = await getClassById(child.classId);
          setChildClass(classData);
        } catch (error) {
          logger.error('Error loading class:', error);
        }
      }
    };
    
    loadClass();
  }, [child.classId]);

  const getCardStyles = () => {
    if (isSelected) {
      return isAuthorized 
        ? 'border-blue-500 bg-blue-50 shadow-md scale-105' 
        : 'border-school-secondary bg-green-50 shadow-md scale-105';
    }
    
    if (isAuthorized) {
      return 'border-blue-200 bg-blue-25 hover:border-blue-300 hover:shadow-sm';
    }
    
    return 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm';
  };

  const getIconStyles = () => {
    if (isSelected) {
      return isAuthorized 
        ? 'bg-blue-100 border-2 border-blue-300' 
        : 'bg-green-100 border-2 border-green-300';
    }
    
    return isAuthorized 
      ? 'bg-blue-100' 
      : 'bg-blue-100';
  };

  const getIconColor = () => {
    if (isSelected) {
      return isAuthorized ? 'text-blue-600' : 'text-green-600';
    }
    
    return isAuthorized ? 'text-blue-600' : 'text-blue-600';
  };

  const getTextColor = () => {
    if (isSelected) {
      return isAuthorized ? 'text-blue-800' : 'text-green-800';
    }
    
    return 'text-gray-800';
  };

  const getCheckStyles = () => {
    return isAuthorized 
      ? 'bg-blue-500' 
      : 'bg-green-500';
  };

  return (
    <div
      className={`
        relative p-4 border-2 rounded-lg transition-all duration-200 
        ${getCardStyles()}
        ${isDisabled 
          ? 'opacity-60 cursor-not-allowed' 
          : 'cursor-pointer hover:scale-102'
        }
      `}
      onClick={isDisabled ? undefined : onClick}
    >
      <div className="flex items-center gap-3">
        <div className={`
          w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-200
          ${getIconStyles()}
        `}>
          <UserRound className={`h-6 w-6 ${getIconColor()}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold text-lg ${getTextColor()}`}>
              {child.name}
            </h3>
            {isAuthorized && (
              <div className="flex items-center">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="sr-only">Authorized to pick up</span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground text-left">
            {childClass ? childClass.name : t('common.unknownClass')}
          </p>
          {isAuthorized && (
            <p className="text-xs text-blue-600 font-medium text-left">
              {t('dashboard.authorizedPickup')}
            </p>
          )}
        </div>
      </div>

      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className={`w-6 h-6 rounded-full ${getCheckStyles()} flex items-center justify-center`}>
            <Check className="h-4 w-4 text-white" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChildCard;
