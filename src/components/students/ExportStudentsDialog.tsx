
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Loader2 } from "lucide-react";
import { Class } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

interface ExportStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classList: Class[];
  onExport: (classId: string | null) => void;
  isExporting?: boolean;
}

const ExportStudentsDialog = ({
  open,
  onOpenChange,
  classList,
  onExport,
  isExporting = false,
}: ExportStudentsDialogProps) => {
  const { t } = useTranslation();
  const [selectedClassId, setSelectedClassId] = useState<string>("all");

  const handleExport = () => {
    onExport(selectedClassId === "all" ? null : selectedClassId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('admin.exportCSV')}</DialogTitle>
          <DialogDescription>
            {t('admin.exportDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <label className="text-sm font-medium mb-2 block">
            {t('studentTable.class')}
          </label>
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.allClasses')}</SelectItem>
              {classList.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleExport} disabled={isExporting} className="bg-school-primary">
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('admin.exporting')}
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                {t('admin.exportCSV')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportStudentsDialog;
