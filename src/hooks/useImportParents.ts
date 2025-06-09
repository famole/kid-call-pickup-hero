
import { useState } from 'react';
import { ParentInput } from '@/types/parent';
import { importParentsFromCSV } from '@/services/parentService';
import { parseCSV } from '@/utils/csvUtils';
import { useToast } from "@/components/ui/use-toast"; // Corrected import path

interface UseImportParentsProps {
  onImportCompleted: () => void; // Callback to refresh parent list
}

export const useImportParents = ({ onImportCompleted }: UseImportParentsProps) => {
  const { toast } = useToast();
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const openImportDialog = () => {
    setImportFile(null);
    setIsImportDialogOpen(true);
  };

  const closeImportDialog = () => {
    setIsImportDialogOpen(false);
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
    }
  };

  const handleImportSubmit = async () => {
    if (!importFile) {
      toast({
        title: "Error",
        description: "Please select a file to import",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, errors } = await parseCSV<ParentInput>(importFile);
      if (errors.length > 0) {
        toast({
          title: "Warning",
          description: `${errors.length} rows contain errors and will be skipped.`,
        });
      }

      const result = await importParentsFromCSV(data);
      toast({
        title: "Import Complete",
        description: `Successfully imported ${result.success} parents. ${result.errors} failed.`,
      });

      onImportCompleted(); // Trigger refresh
      closeImportDialog();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import parents",
        variant: "destructive",
      });
    }
  };

  return {
    isImportDialogOpen,
    openImportDialog,
    closeImportDialog,
    handleImportFileChange,
    handleImportSubmit,
  };
};
