import React, { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useOptimizedWithdrawalHistory } from '@/hooks/useOptimizedWithdrawalHistory';
import Navigation from '@/components/Navigation';
import WithdrawalHistoryTable from '@/components/withdrawal-history/WithdrawalHistoryTable';

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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">{t('withdrawal.historyTitle')}</h1>
          <p className="text-muted-foreground mt-2">{t('withdrawal.historyDescription')}</p>
        </div>

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