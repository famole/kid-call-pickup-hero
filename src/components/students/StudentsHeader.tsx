
import React from 'react';
import { Button } from "@/components/ui/button";
import { UserRound, Upload, Download, Plus, GraduationCap } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import FullImportDialog from "@/components/admin-imports/FullImportDialog";
import { useTranslation } from "@/hooks/useTranslation";

interface StudentsHeaderProps {
  onExportCSV: () => void;
  onImportCSV: () => void;
  onAddStudent: () => void;
  onFullImportCompleted?: () => void;
  onGraduateStudents: () => void;
}

const StudentsHeader = ({
  onExportCSV,
  onImportCSV,
  onAddStudent,
  onFullImportCompleted,
  onGraduateStudents,
}: StudentsHeaderProps) => {
  const { t } = useTranslation();
  
  return (
    <header className="mb-8 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <UserRound className="h-8 w-8 text-school-primary" />
          <h1 className="text-3xl font-bold">{t('admin.manageStudents')}</h1>
        </div>
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onExportCSV} variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('admin.exportCSV')}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onImportCSV} variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <Upload className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('admin.importCSV')}</TooltipContent>
            </Tooltip>

            <FullImportDialog onCompleted={onFullImportCompleted} />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onGraduateStudents}
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <GraduationCap className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('admin.graduateStudents')}</TooltipContent>
            </Tooltip>

            <Button onClick={onAddStudent} className="bg-school-primary ml-2">
              <Plus className="mr-2 h-4 w-4" /> {t('admin.addStudent')}
            </Button>
          </div>
        </TooltipProvider>
      </div>
    </header>
  );
};

export default StudentsHeader;
