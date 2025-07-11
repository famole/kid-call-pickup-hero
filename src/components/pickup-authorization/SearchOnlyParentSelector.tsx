import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Parent {
  id: string;
  name: string;
  email: string;
  sharedStudentNames?: string[];
}

interface SearchOnlyParentSelectorProps {
  parents: Parent[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  showOnlySharedParents: boolean;
  onToggleFilter: () => void;
  parentsWhoShareStudents: Parent[];
}

const SearchOnlyParentSelector: React.FC<SearchOnlyParentSelectorProps> = ({
  parents,
  value,
  onValueChange,
  placeholder = "Search for a parent by name",
  showOnlySharedParents,
  onToggleFilter,
  parentsWhoShareStudents,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredParents, setFilteredParents] = useState<Parent[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get selected parent name
  const selectedParent = parents.find(p => p.id === value);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredParents([]);
      return;
    }

    const filtered = parents.filter(parent =>
      parent.name.toLowerCase().startsWith(searchTerm.toLowerCase())
    );

    setFilteredParents(filtered.slice(0, 10)); // Limit to 10 results
  }, [searchTerm, parents]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    setIsOpen(term.length > 0);
  };

  const handleSelectParent = (parent: Parent) => {
    onValueChange(parent.id);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClearSelection = () => {
    onValueChange('');
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Authorized Parent</Label>
        {parentsWhoShareStudents.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToggleFilter}
            className="text-xs"
          >
            <Users className="h-3 w-3 mr-1" />
            {showOnlySharedParents ? 'Show All' : 'Shared Only'}
            {showOnlySharedParents && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {parentsWhoShareStudents.length}
              </Badge>
            )}
          </Button>
        )}
      </div>

      {selectedParent && (
        <div className="p-2 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between">
          <span className="font-medium text-sm">{selectedParent.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearSelection}
            className="h-6 w-6 p-0 hover:bg-blue-100"
          >
            ×
          </Button>
        </div>
      )}

      {!selectedParent && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={searchTerm}
              onChange={handleInputChange}
              onFocus={() => searchTerm.length > 0 && setIsOpen(true)}
              className="pl-10"
            />
          </div>

          {isOpen && filteredParents.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
            >
              {filteredParents.map((parent) => (
                <button
                  key={parent.id}
                  type="button"
                  onClick={() => handleSelectParent(parent)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-sm">{parent.name}</div>
                  {parent.sharedStudentNames && parent.sharedStudentNames.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Shares: {parent.sharedStudentNames.join(', ')}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {isOpen && searchTerm.length > 0 && filteredParents.length === 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg"
            >
              <div className="px-3 py-2 text-sm text-gray-500">
                No parents found matching "{searchTerm}"
              </div>
            </div>
          )}
        </div>
      )}

      {showOnlySharedParents && parentsWhoShareStudents.length > 0 && (
        <p className="text-xs text-gray-500">
          Searching among {parentsWhoShareStudents.length} parent(s) who share children with you
        </p>
      )}
    </div>
  );
};

export default SearchOnlyParentSelector;
