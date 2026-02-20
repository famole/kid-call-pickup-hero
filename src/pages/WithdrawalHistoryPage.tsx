import React, { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useOptimizedWithdrawalHistory } from '@/hooks/useOptimizedWithdrawalHistory';
import Navigation from '@/components/Navigation';
import WithdrawalHistoryTable from '@/components/withdrawal-history/WithdrawalHistoryTable';
import PageHeader from '@/components/PageHeader';

const WithdrawalHistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { withdrawalData, loading } = useOptimizedWithdrawalHistory({ year, month });

  return (
    <div className="min-h-screen w-full bg-background">
      <Navigation />
      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <PageHeader
          title={t('withdrawal.historyTitle', 'Historial de Salidas')}
          description={t('withdrawal.historyDescription')}
        />

        <WithdrawalHistoryTable
          data={withdrawalData}
          loading={loading}
          year={year}
          month={month}
          onYearChange={setYear}
          onMonthChange={setMonth}
        />
      </div>
    </div>
  );
};

export default WithdrawalHistoryPage;
