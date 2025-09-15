import React from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/hooks/useTranslation';

interface DayOfWeekSelectorProps {
  selectedDays: number[];
  onChange: (days: number[]) => void;
  label?: string;
}

const DayOfWeekSelector: React.FC<DayOfWeekSelectorProps> = ({
  selectedDays,
  onChange,
  label
}) => {
  const { t } = useTranslation();

  // Days of week (0=Sunday, 1=Monday, ..., 6=Saturday)
  const daysOfWeek = [
    { value: 0, label: t('common.days.sunday'), short: t('common.days.sun') },
    { value: 1, label: t('common.days.monday'), short: t('common.days.mon') },
    { value: 2, label: t('common.days.tuesday'), short: t('common.days.tue') },
    { value: 3, label: t('common.days.wednesday'), short: t('common.days.wed') },
    { value: 4, label: t('common.days.thursday'), short: t('common.days.thu') },
    { value: 5, label: t('common.days.friday'), short: t('common.days.fri') },
    { value: 6, label: t('common.days.saturday'), short: t('common.days.sat') },
  ];

  const toggleDay = (dayValue: number) => {
    const newSelectedDays = selectedDays.includes(dayValue)
      ? selectedDays.filter(day => day !== dayValue)
      : [...selectedDays, dayValue].sort();
    
    onChange(newSelectedDays);
  };

  const selectAllDays = () => {
    onChange([0, 1, 2, 3, 4, 5, 6]);
  };

  const selectWeekdays = () => {
    onChange([1, 2, 3, 4, 5]); // Monday to Friday
  };

  const selectWeekends = () => {
    onChange([0, 6]); // Sunday and Saturday
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-3">
      {label && <Label>{label}</Label>}
      
      {/* Quick select buttons */}
      <div className="flex flex-wrap gap-2 text-sm">
        <button
          type="button"
          onClick={selectAllDays}
          className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80"
        >
          {t('pickupAuthorizations.allDays')}
        </button>
        <button
          type="button"
          onClick={selectWeekdays}
          className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80"
        >
          {t('pickupAuthorizations.weekdays')}
        </button>
        <button
          type="button"
          onClick={selectWeekends}
          className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80"
        >
          {t('pickupAuthorizations.weekends')}
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80"
        >
          {t('common.clear')}
        </button>
      </div>

      {/* Day selection */}
      <div className="flex flex-wrap gap-2">
        {daysOfWeek.map((day) => (
          <Badge
            key={day.value}
            variant={selectedDays.includes(day.value) ? "default" : "outline"}
            className="cursor-pointer select-none px-3 py-1"
            onClick={() => toggleDay(day.value)}
          >
            <span className="hidden sm:inline">{day.label}</span>
            <span className="sm:hidden">{day.short}</span>
          </Badge>
        ))}
      </div>

      {selectedDays.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t('pickupAuthorizations.selectAtLeastOneDay')}
        </p>
      )}
    </div>
  );
};

export default DayOfWeekSelector;