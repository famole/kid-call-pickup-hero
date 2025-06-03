
import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
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
import { ParentWithStudents } from '@/types/parent';

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
  placeholder = "Select a parent...",
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const selectedParent = parents.find(parent => parent.id === value);

  const filteredParents = parents.filter(parent =>
    parent.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    parent.email.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedParent ? (
            <span className="truncate">
              {selectedParent.name} ({selectedParent.email})
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
        <Command>
          <CommandInput 
            placeholder="Search parents..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>No parent found.</CommandEmpty>
            <CommandGroup>
              {filteredParents.map((parent) => (
                <CommandItem
                  key={parent.id}
                  value={parent.id}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === parent.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{parent.name}</span>
                    <span className="text-sm text-gray-500">{parent.email}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default ParentSelector;
