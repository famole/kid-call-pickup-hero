
import React from 'react';
import { Button } from "@/components/ui/button";
import { UserRound, Upload, Download, Plus } from "lucide-react";
import FullImportDialog from "@/components/admin-imports/FullImportDialog";
import { useTranslation } from "@/hooks/useTranslation";

interface StudentsHeaderProps {
  onExportCSV: () => void;
  onImportCSV: () => void;
  onAddStudent: () => void;
  onFullImportCompleted?: () => void;
}

const StudentsHeader = ({
  onExportCSV,
  onImportCSV,
  onAddStudent,
  onFullImportCompleted,
}: StudentsHeaderProps) => {
  const { t } = useTranslation();
  
  return (
    <header className="mb-8 text-left">
      <div className="flex flex-col sm:flex-row sm:items-start justify-start gap-4">
        <div className="flex items-center gap-3 text-left">
          <UserRound className="h-8 w-8 text-school-primary" />
          <h1 className="text-3xl font-bold text-left">{t('admin.manageStudents')}</h1>
        </div>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <Button onClick={onExportCSV} variant="outline" className="flex-1 sm:flex-none">
            <Download className="mr-2 h-4 w-4" /> {t('admin.exportCSV')}
          </Button>
          <Button 
            onClick={onImportCSV} 
            variant="outline" 
            className="flex-1 sm:flex-none bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
          >
            <Upload className="mr-2 h-4 w-4" /> {t('admin.importCSV')}
          </Button>
          <FullImportDialog onCompleted={onFullImportCompleted} />
          <Button 
            onClick={onAddStudent} 
            className="bg-school-primary flex-1 sm:flex-none"
          >
            <Plus className="mr-2 h-4 w-4" /> {t('admin.addStudent')}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default StudentsHeader;
