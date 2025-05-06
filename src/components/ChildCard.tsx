
import React from 'react';
import { Child } from '@/types';
import { getClassById } from '@/services/mockData';
import { UserRound } from 'lucide-react';

interface ChildCardProps {
  child: Child;
  isSelected: boolean;
  isDisabled?: boolean;
  onClick: () => void;
}

const ChildCard: React.FC<ChildCardProps> = ({ child, isSelected, isDisabled = false, onClick }) => {
  const childClass = getClassById(child.classId);

  return (
    <div
      className={`child-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'opacity-60' : 'cursor-pointer'}`}
      onClick={isDisabled ? undefined : onClick}
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
          <UserRound className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">{child.name}</h3>
          <p className="text-sm text-muted-foreground">
            {childClass ? childClass.name : 'Unknown Class'}
          </p>
        </div>
      </div>

      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className="w-4 h-4 rounded-full bg-school-secondary"></div>
        </div>
      )}
    </div>
  );
};

export default ChildCard;
