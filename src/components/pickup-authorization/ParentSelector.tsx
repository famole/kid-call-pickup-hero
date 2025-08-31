
import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { matchesSearch } from '@/utils/textUtils';
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
import { Badge } from '@/components/ui/badge';
import { ParentWithStudents } from '@/types/parent';
import RoleBadge from './RoleBadge';

interface ParentSelectorProps {
  parents: ParentWithStudents[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const ParentSelector: React.FC<ParentSelectorProps> = ({
  parents,
  value,
  onValueChange,
  placeholder = "Search and select a parent...",
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const selectedParent = parents.find(parent => parent.id === value);

  const filteredParents = parents.filter(parent => {
    if (!searchValue.trim()) return true;
    
    // Search by parent name
    if (matchesSearch(parent.name, searchValue)) return true;
    
    // Search by parent email
    if (matchesSearch(parent.email, searchValue)) return true;
    
    // Search by children names
    if (parent.students && parent.students.length > 0) {
      return parent.students.some(student =>
        matchesSearch(student.name, searchValue)
      );
    }
    
    return false;
  });

  const clearSelection = () => {
    onValueChange('');
    setSearchValue('');
  };

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-10 px-3 py-2"
            disabled={disabled}
          >
            <div className="flex-1 text-left">
              {selectedParent ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate">
                        {selectedParent.name}
                      </span>
                      {!disabled && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-gray-100 ml-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearSelection();
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="truncate">{selectedParent.email}</span>
                      {selectedParent.role && <RoleBadge role={selectedParent.role} size="sm" />}
                    </div>
                  {selectedParent.students && selectedParent.students.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedParent.students.slice(0, 2).map((student) => (
                        <Badge 
                          key={student.id} 
                          variant="secondary" 
                          className="text-xs px-1 py-0"
                        >
                          {student.name}
                        </Badge>
                      ))}
                      {selectedParent.students.length > 2 && (
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          +{selectedParent.students.length - 2} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center text-gray-500">
                  <Search className="h-4 w-4 mr-2" />
                  <span className="text-sm">{placeholder}</span>
                </div>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-full p-0" 
          style={{ width: 'var(--radix-popover-trigger-width)' }}
          align="start"
        >
          <Command>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput 
                placeholder="Search by name, email, or children..." 
                value={searchValue}
                onValueChange={setSearchValue}
                className="flex-1 border-0 focus:ring-0"
              />
            </div>
            <CommandList className="max-h-60">
              <CommandEmpty className="py-6 text-center text-sm">
                <div className="space-y-2">
                  <Search className="h-8 w-8 text-gray-300 mx-auto" />
                  <p>No parents found</p>
                  <p className="text-xs text-gray-500">
                    Try searching by name, email, or children's names
                  </p>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {filteredParents.map((parent) => (
                  <CommandItem
                    key={parent.id}
                    value={parent.id}
                    onSelect={(currentValue) => {
                      onValueChange(currentValue === value ? "" : currentValue);
                      setOpen(false);
                      setSearchValue('');
                    }}
                    className="px-3 py-3"
                  >
                    <Check
                      className={cn(
                        "mr-3 h-4 w-4 flex-shrink-0",
                        value === parent.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">
                          {parent.name}
                        </span>
                        {parent.role && <RoleBadge role={parent.role} size="sm" />}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {parent.email}
                      </div>
                      {parent.students && parent.students.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="text-xs text-gray-400">Children:</span>
                          {parent.students.slice(0, 3).map((student) => (
                            <Badge 
                              key={student.id} 
                              variant="outline" 
                              className="text-xs px-1 py-0"
                            >
                              {student.name}
                            </Badge>
                          ))}
                          {parent.students.length > 3 && (
                            <span className="text-xs text-gray-400">
                              +{parent.students.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
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

export default ParentSelector;
