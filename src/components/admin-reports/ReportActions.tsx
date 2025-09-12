
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface ReportActionsProps {
  onGenerateReport: () => void;
  onExportCSV: () => void;
  loading: boolean;
  hasData: boolean;
}

const ReportActions: React.FC<ReportActionsProps> = ({
  onGenerateReport,
  onExportCSV,
  loading,
  hasData
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="flex gap-2">
      <Button 
        onClick={onGenerateReport} 
        disabled={loading}
      >
        <FileText className="h-4 w-4 mr-2" />
        {loading ? t('reports.generating') : t('reports.generateReport')}
      </Button>
      <Button 
        variant="outline"
        onClick={onExportCSV}
        disabled={!hasData}
      >
        <Download className="h-4 w-4 mr-2" />
        {t('reports.exportReport')}
      </Button>
    </div>
  );
};

export default ReportActions;
