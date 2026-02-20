
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
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
  
  return (
    <header className="mb-8 text-left">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <UserRound className="h-5 w-5 sm:h-8 sm:w-8 text-school-primary flex-shrink-0" />
          <h1 className="text-base sm:text-3xl font-bold truncate">{t('admin.manageStudents')}</h1>
        </div>
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-0 sm:gap-1 flex-shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onExportCSV} variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground">
                  <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('admin.exportCSV')}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onImportCSV} variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground">
                  <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('admin.importCSV')}</TooltipContent>
            </Tooltip>

            {!isMobile && <FullImportDialog onCompleted={onFullImportCompleted} />}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onReassignStudents} variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground">
                  <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('admin.reassignStudents')}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onGraduateStudents} variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground">
                  <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('admin.graduateStudents')}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onWithdrawStudents} variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground">
                  <UserMinus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('admin.withdrawStudents')}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                {isMobile ? (
                  <Button onClick={onAddStudent} size="icon" className="h-7 w-7 bg-school-primary ml-0.5">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button onClick={onAddStudent} size="sm" className="bg-school-primary ml-1">
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> {t('admin.addStudent')}
                  </Button>
                )}
              </TooltipTrigger>
              {isMobile && <TooltipContent>{t('admin.addStudent')}</TooltipContent>}
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
    </header>
  );
};

export default StudentsHeader;
