import { useState } from 'react';
import { logger } from '@/utils/logger';

interface UseDeleteConfirmationProps<T> {
  onDelete: (item: T) => Promise<void>;
  getItemName?: (item: T) => string;
  getConfirmationText?: (item: T) => { title: string; description: string };
}

export const useDeleteConfirmation = <T>({
  onDelete,
  getItemName,
  getConfirmationText,
}: UseDeleteConfirmationProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);

  const openDeleteConfirmation = (item: T) => {
    setItemToDelete(item);
    setIsOpen(true);
  };

  const closeDeleteConfirmation = () => {
    setIsOpen(false);
    setItemToDelete(null);
    setIsLoading(false);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      setIsLoading(true);
      await onDelete(itemToDelete);
      closeDeleteConfirmation();
    } catch (error) {
      logger.error('Error deleting item:', error);
      setIsLoading(false);
    }
  };

  const getItemDisplayName = () => {
    if (!itemToDelete || !getItemName) return undefined;
    return getItemName(itemToDelete);
  };

  const getDialogTexts = () => {
    if (!itemToDelete || !getConfirmationText) {
      return {
        title: 'Delete Item',
        description: 'Are you sure you want to delete this item? This action cannot be undone.',
      };
    }
    return getConfirmationText(itemToDelete);
  };

  return {
    isOpen,
    isLoading,
    itemToDelete,
    openDeleteConfirmation,
    closeDeleteConfirmation,
    handleConfirmDelete,
    getItemDisplayName,
    getDialogTexts,
  };
};