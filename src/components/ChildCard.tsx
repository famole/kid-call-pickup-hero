
import React from 'react';
import { Child } from '@/types';
import { getClassById } from '@/services/classService';
import { UserRound, Check } from 'lucide-react';

interface ChildCardProps {
  child: Child;
  isSelected: boolean;
  isDisabled?: boolean;
  onClick: () => void;
}

const ChildCard: React.FC<ChildCardProps> = ({ child, isSelected, isDisabled = false, onClick }) => {
  const [childClass, setChildClass] = React.useState<any>(null);

  React.useEffect(() => {
    const loadClass = async () => {
      if (child.classId) {
        try {
          const classData = await getClassById(child.classId);
          setChildClass(classData);
        } catch (error) {
          console.error('Error loading class:', error);
        }
      }
    };
    
    loadClass();
  }, [child.classId]);

  return (
    <div
      className={`
        relative p-4 border-2 rounded-lg transition-all duration-200 
        ${isSelected 
          ? 'border-school-secondary bg-green-50 shadow-md scale-105' 
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
        } 
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
          ${isSelected ? 'bg-green-100 border-2 border-green-300' : 'bg-blue-100'}
        `}>
          <UserRound className={`h-6 w-6 ${isSelected ? 'text-green-600' : 'text-blue-600'}`} />
        </div>
        <div className="flex-1">
          <h3 className={`font-semibold text-lg ${isSelected ? 'text-green-800' : 'text-gray-800'}`}>
            {child.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {childClass ? childClass.name : 'Unknown Class'}
          </p>
        </div>
      </div>

      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="h-4 w-4 text-white" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChildCard;
