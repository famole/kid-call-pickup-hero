
import React, { useState } from 'react';
import { Check, ChevronDown, Search, Filter, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from '@/hooks/useTranslation';

interface ParentWithSharedStudents {
  id: string;
  name: string;
  email: string;
  sharedStudentNames?: string[];
  students?: any[];
}

interface SharedStudentsParentSelectorProps {
  parents: ParentWithSharedStudents[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  showOnlySharedParents: boolean;
  onToggleFilter: () => void;
  parentsWhoShareStudents: ParentWithSharedStudents[];
}

const SharedStudentsParentSelector: React.FC<SharedStudentsParentSelectorProps> = ({
  parents,
  value,
  onValueChange,
  placeholder,
  showOnlySharedParents,
  onToggleFilter,
  parentsWhoShareStudents,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const selectedParent = parents.find((parent) => parent.id === value);

  const displayParents = showOnlySharedParents ? parentsWhoShareStudents : parents;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onToggleFilter}
          className={cn(
            "flex items-center gap-2 text-xs",
            showOnlySharedParents && "bg-school-primary/10 text-school-primary border-school-primary"
          )}
        >
          <Filter className="h-3 w-3" />
          {showOnlySharedParents ? t('pickupAuthorizations.sharedParentsOnly') : t('pickupAuthorizations.allParents')}
          {showOnlySharedParents && parentsWhoShareStudents.length > 0 && (
            <span className="bg-school-primary text-white rounded-full px-1.5 py-0.5 text-xs min-w-[1.25rem] h-5 flex items-center justify-center">
              {parentsWhoShareStudents.length}
            </span>
          )}
        </Button>
        {parentsWhoShareStudents.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Users className="h-3 w-3" />
            <span>{t('pickupAuthorizations.parentsShareChildren', { count: parentsWhoShareStudents.length })}</span>
          </div>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedParent ? (
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="truncate">{selectedParent.name}</span>
                {selectedParent.sharedStudentNames && selectedParent.sharedStudentNames.length > 0 && (
                  <span className="text-xs text-school-primary truncate">
                    {t('pickupAuthorizations.shares')}: {selectedParent.sharedStudentNames.join(', ')}
                  </span>
                )}
              </div>
            ) : (
              placeholder || t('pickupAuthorizations.selectParent')
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput placeholder={t('pickupAuthorizations.searchParents')} className="flex h-11" />
            </div>
            <CommandList className="max-h-[300px] overflow-y-auto">
              <CommandEmpty>{t('pickupAuthorizations.noParentsFound')}</CommandEmpty>
              <CommandGroup>
                {displayParents.map((parent) => (
                  <CommandItem
                    key={parent.id}
                    value={`${parent.name} ${parent.email}`}
                    onSelect={() => {
                      onValueChange(parent.id);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex flex-col items-start min-w-0 flex-1">
                      <div className="flex items-center gap-2 w-full">
                        <span className="truncate">{parent.name}</span>
                        {parent.sharedStudentNames && parent.sharedStudentNames.length > 0 && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Users className="h-3 w-3 text-school-primary" />
                            <span className="text-xs text-school-primary">
                              {parent.sharedStudentNames.length}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 truncate w-full">{parent.email}</span>
                      {parent.sharedStudentNames && parent.sharedStudentNames.length > 0 && (
                        <span className="text-xs text-school-primary truncate w-full">
                          {t('pickupAuthorizations.shares')}: {parent.sharedStudentNames.join(', ')}
                        </span>
                      )}
                    </div>
                    <Check
                      className={cn(
                        "ml-2 h-4 w-4 flex-shrink-0",
                        value === parent.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default SharedStudentsParentSelector;
