
import React from 'react';
import { Button } from "@/components/ui/button";
import { UserRound, Upload, Download, Plus, GraduationCap, RefreshCw, UserMinus } from "lucide-react";
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
  onReassignStudents: () => void;
  onWithdrawStudents: () => void;
}

const StudentsHeader = ({
  onExportCSV,
  onImportCSV,
  onAddStudent,
  onFullImportCompleted,
  onGraduateStudents,
  onReassignStudents,
  onWithdrawStudents,
}: StudentsHeaderProps) => {
  const { t } = useTranslation();
  
  return (
    <header className="mb-8 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <UserRound className="h-6 w-6 sm:h-8 sm:w-8 text-school-primary flex-shrink-0" />
          <h1 className="text-xl sm:text-3xl font-bold truncate">{t('admin.manageStudents')}</h1>
        </div>
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-1 flex-wrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onExportCSV} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('admin.exportCSV')}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onImportCSV} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <Upload className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('admin.importCSV')}</TooltipContent>
            </Tooltip>

            <FullImportDialog onCompleted={onFullImportCompleted} />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onReassignStudents}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('admin.reassignStudents')}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onGraduateStudents}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <GraduationCap className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('admin.graduateStudents')}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onWithdrawStudents}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('admin.withdrawStudents')}</TooltipContent>
            </Tooltip>

            <Button onClick={onAddStudent} size="sm" className="bg-school-primary ml-1 text-xs sm:text-sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> {t('admin.addStudent')}
            </Button>
          </div>
        </TooltipProvider>
      </div>
    </header>
  );
};

export default StudentsHeader;
