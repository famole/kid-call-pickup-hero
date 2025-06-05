
import React, { useState } from 'react';
import { Check, ChevronsUpDown, Search, X, Users } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

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
  disabled?: boolean;
  showOnlySharedParents: boolean;
  onToggleFilter: () => void;
  parentsWhoShareStudents: ParentWithSharedStudents[];
}

const SharedStudentsParentSelector: React.FC<SharedStudentsParentSelectorProps> = ({
  parents,
  value,
  onValueChange,
  placeholder = "Search and select a parent...",
  disabled = false,
  showOnlySharedParents,
  onToggleFilter,
  parentsWhoShareStudents,
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const selectedParent = parents.find(parent => parent.id === value);

  const filteredParents = parents.filter(parent => {
    if (!searchValue.trim()) return true;
    
    const searchTerm = searchValue.toLowerCase();
    
    // Search by parent name
    if (parent.name.toLowerCase().includes(searchTerm)) return true;
    
    // Search by parent email
    if (parent.email.toLowerCase().includes(searchTerm)) return true;
    
    // Search by shared children names
    if (parent.sharedStudentNames && parent.sharedStudentNames.length > 0) {
      return parent.sharedStudentNames.some(name =>
        name.toLowerCase().includes(searchTerm)
      );
    }
    
    return false;
  });

  const clearSelection = () => {
    onValueChange('');
    setSearchValue('');
  };

  const isSharedParent = (parentId: string) => {
    return parentsWhoShareStudents.some(p => p.id === parentId);
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center space-x-2">
        <Switch
          id="shared-parents-filter"
          checked={showOnlySharedParents}
          onCheckedChange={onToggleFilter}
        />
        <Label htmlFor="shared-parents-filter" className="text-sm">
          Only show parents who share students with me ({parentsWhoShareStudents.length})
        </Label>
      </div>

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
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {selectedParent.name}
                      </span>
                      {isSharedParent(selectedParent.id) && (
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          <Users className="h-3 w-3 mr-1" />
                          Shared
                        </Badge>
                      )}
                    </div>
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
                  <div className="text-xs text-gray-500 truncate">
                    {selectedParent.email}
                  </div>
                  {selectedParent.sharedStudentNames && selectedParent.sharedStudentNames.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="text-xs text-gray-400">Shared children:</span>
                      {selectedParent.sharedStudentNames.slice(0, 2).map((name, index) => (
                        <Badge 
                          key={index} 
                          variant="outline" 
                          className="text-xs px-1 py-0 bg-school-primary/10 text-school-primary border-school-primary/20"
                        >
                          {name}
                        </Badge>
                      ))}
                      {selectedParent.sharedStudentNames.length > 2 && (
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          +{selectedParent.sharedStudentNames.length - 2} more
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
                placeholder="Search by name, email, or shared children..." 
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
                    Try adjusting the filter or search terms
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
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {parent.name}
                        </span>
                        {isSharedParent(parent.id) && (
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            <Users className="h-3 w-3 mr-1" />
                            Shared
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {parent.email}
                      </div>
                      {parent.sharedStudentNames && parent.sharedStudentNames.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="text-xs text-gray-400">Shared children:</span>
                          {parent.sharedStudentNames.slice(0, 2).map((name, index) => (
                            <Badge 
                              key={index} 
                              variant="outline" 
                              className="text-xs px-1 py-0 bg-school-primary/10 text-school-primary border-school-primary/20"
                            >
                              {name}
                            </Badge>
                          ))}
                          {parent.sharedStudentNames.length > 2 && (
                            <span className="text-xs text-gray-400">
                              +{parent.sharedStudentNames.length - 2} more
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

export default SharedStudentsParentSelector;
