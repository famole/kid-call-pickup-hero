
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';

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
  return (
    <div className="flex gap-2">
      <Button 
        onClick={onGenerateReport} 
        disabled={loading}
      >
        <FileText className="h-4 w-4 mr-2" />
        {loading ? 'Generating...' : 'Generate Report'}
      </Button>
      <Button 
        variant="outline"
        onClick={onExportCSV}
        disabled={!hasData}
      >
        <Download className="h-4 w-4 mr-2" />
        Export CSV
      </Button>
    </div>
  );
};

export default ReportActions;
