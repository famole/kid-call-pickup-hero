import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, Users, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/hooks/useTranslation';
import { secureOperations } from '@/services/encryption/secureSupabaseClient';
import { getCurrentParentIdCached } from '@/services/parent/getCurrentParentId';
import { logger } from '@/utils/logger';

interface Parent {
  id: string;
  name: string;
  email: string;
  username?: string;
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
  placeholder,
  showOnlySharedParents,
  onToggleFilter,
  parentsWhoShareStudents,
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredParents, setFilteredParents] = useState<Parent[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedParentData, setSelectedParentData] = useState<Parent | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get selected parent - check local state first, then fall back to parents prop
  const selectedParent = value ? (selectedParentData?.id === value ? selectedParentData : parents.find(p => p.id === value)) ?? selectedParentData : null;

  const performSearch = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setFilteredParents([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const currentParentId = await getCurrentParentIdCached();
      if (!currentParentId) {
        logger.error('No current parent ID found');
        setFilteredParents([]);
        return;
      }

      const results = await secureOperations.searchParentsSecure(term, currentParentId);
      
      // Filter by showOnlySharedParents if needed
      const finalResults = showOnlySharedParents
        ? results.filter(parent => 
            parentsWhoShareStudents.some(sharedParent => sharedParent.id === parent.id)
          )
        : results;
      
      setFilteredParents(finalResults);
    } catch (error) {
      logger.error('Error searching parents:', error);
      setFilteredParents([]);
    } finally {
      setIsSearching(false);
    }
  }, [showOnlySharedParents, parentsWhoShareStudents]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchTerm.trim()) {
      setFilteredParents([]);
      setIsSearching(false);
      return;
    }

    if (searchTerm.trim().length < 2) {
      setFilteredParents([]);
      setIsSearching(false);
      return;
    }

    // Debounce search by 300ms
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchTerm);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, performSearch]);

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
    setSelectedParentData(parent);
    onValueChange(parent.id);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClearSelection = () => {
    setSelectedParentData(null);
    onValueChange('');
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{t('pickupAuthorizations.authorizedParent')}</Label>
        {parentsWhoShareStudents.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToggleFilter}
            className="text-xs"
          >
            <Users className="h-3 w-3 mr-1" />
            {showOnlySharedParents ? t('pickupAuthorizations.showAll') : t('pickupAuthorizations.sharedOnly')}
            {showOnlySharedParents && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {parentsWhoShareStudents.length}
              </Badge>
            )}
          </Button>
        )}
      </div>

      {selectedParent && (
        <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-sm">{selectedParent.name}</span>
              <div className="text-xs text-gray-500">{selectedParent.username || selectedParent.email}</div>
            </div>
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
        </div>
      )}

      {!selectedParent && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={placeholder || t('pickupAuthorizations.searchForParent') + ' (min 2 characters)'}
              value={searchTerm}
              onChange={handleInputChange}
              onFocus={() => searchTerm.length >= 2 && setIsOpen(true)}
              className="pl-10"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 animate-spin" />
            )}
          </div>

          {searchTerm.length > 0 && searchTerm.length < 2 && (
            <p className="text-xs text-gray-500 mt-1">
              {t('pickupAuthorizations.typeMoreCharacters', { remaining: 2 - searchTerm.length })}
            </p>
          )}

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
                      {t('pickupAuthorizations.shares')}: {parent.sharedStudentNames.join(', ')}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {isOpen && searchTerm.length >= 2 && !isSearching && filteredParents.length === 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg"
            >
              <div className="px-3 py-2 text-sm text-gray-500">
                {t('pickupAuthorizations.noParentsFoundSearching', { searchTerm })}
              </div>
            </div>
          )}
        </div>
      )}

      {showOnlySharedParents && parentsWhoShareStudents.length > 0 && (
        <p className="text-xs text-gray-500">
          {t('pickupAuthorizations.searchingAmong', { count: parentsWhoShareStudents.length })}
        </p>
      )}
    </div>
  );
};

export default SearchOnlyParentSelector;
