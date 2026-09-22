import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import FormModal from '@/components/shared/FormModal';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDate } from '@/components/shared/formatters';
import { Lock, Unlock, Calendar } from 'lucide-react';

const MONTHS = [
  { key: 1, ar: 'يناير', en: 'January' },
  { key: 2, ar: 'فبراير', en: 'February' },
  { key: 3, ar: 'مارس', en: 'March' },
  { key: 4, ar: 'أبريل', en: 'April' },
  { key: 5, ar: 'مايو', en: 'May' },
  { key: 6, ar: 'يونيو', en: 'June' },
  { key: 7, ar: 'يوليو', en: 'July' },
  { key: 8, ar: 'أغسطس', en: 'August' },
  { key: 9, ar: 'سبتمبر', en: 'September' },
  { key: 10, ar: 'أكتوبر', en: 'October' },
  { key: 11, ar: 'نوفمبر', en: 'November' },
  { key: 12, ar: 'ديسمبر', en: 'December' },
];

export default function FiscalPeriods() {
  const { language, t, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ fiscal_year: new Date().getFullYear() });

  const { data: periods = [], isLoading } = useQuery({
    queryKey: ['fiscalPeriods', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.FiscalPeriod.filter({ company_id: currentCompany.id }) : [],
  });

  const createYearMutation = useMutation({
    mutationFn: async (year) => {
      const periods = [];
      for (let month = 1; month <= 12; month++) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        periods.push({
          company_id: currentCompany?.id,
          fiscal_year: year,
          period_number: month,
          period_name: `${year}-${String(month).padStart(2, '0')}`,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          status: 'open'
        });
      }
      return base44.entities.FiscalPeriod.bulkCreate(periods);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscalPeriods'] });
      setModalOpen(false);
      toast.success(language === 'ar' ? 'تم إنشاء السنة المالية' : 'Fiscal year created');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.FiscalPeriod.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscalPeriods'] });
      toast.success(language === 'ar' ? 'تم تحديث الحالة' : 'Status updated');
    }
  });

  const getStatusBadge = (status) => {
    const configs = {
      open: { className: 'bg-green-100 text-green-700', label: language === 'ar' ? 'مفتوح' : 'Open' },
      closed: { className: 'bg-amber-100 text-amber-700', label: language === 'ar' ? 'مغلق' : 'Closed' },
      locked: { className: 'bg-red-100 text-red-700', label: language === 'ar' ? 'مقفل' : 'Locked' },
    };
    const config = configs[status] || configs.open;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const columns = [
    { header: language === 'ar' ? 'السنة' : 'Year', accessorKey: 'fiscal_year' },
    { 
      header: language === 'ar' ? 'الفترة' : 'Period', 
      accessorKey: 'period_number',
      cell: (row) => {
        const month = MONTHS.find(m => m.key === row.period_number);
        return language === 'ar' ? month?.ar : month?.en;
      }
    },
    { header: language === 'ar' ? 'من' : 'From', accessorKey: 'start_date', cell: (row) => formatDate(row.start_date) },
    { header: language === 'ar' ? 'إلى' : 'To', accessorKey: 'end_date', cell: (row) => formatDate(row.end_date) },
    { header: language === 'ar' ? 'الحالة' : 'Status', accessorKey: 'status', cell: (row) => getStatusBadge(row.status) },
    { 
      header: language === 'ar' ? 'الإجراءات' : 'Actions', 
      accessorKey: 'actions',
      cell: (row) => (
        <div className="flex gap-2">
          {row.status === 'open' && (
            <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: row.id, status: 'closed' })}>
              <Lock className="h-4 w-4 mr-1" />
              {language === 'ar' ? 'إغلاق' : 'Close'}
            </Button>
          )}
          {row.status === 'closed' && (
            <>
              <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: row.id, status: 'open' })}>
                <Unlock className="h-4 w-4 mr-1" />
                {language === 'ar' ? 'فتح' : 'Reopen'}
              </Button>
              <Button size="sm" variant="outline" className="text-red-600" onClick={() => updateStatusMutation.mutate({ id: row.id, status: 'locked' })}>
                <Lock className="h-4 w-4 mr-1" />
                {language === 'ar' ? 'قفل' : 'Lock'}
              </Button>
            </>
          )}
        </div>
      )
    }
  ];

  const sortedPeriods = [...periods].sort((a, b) => {
    if (a.fiscal_year !== b.fiscal_year) return b.fiscal_year - a.fiscal_year;
    return a.period_number - b.period_number;
  });

  const existingYears = [...new Set(periods.map(p => p.fiscal_year))];

  return (
    <div className="p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <PageHeader
        title={language === 'ar' ? 'الفترات المالية' : 'Fiscal Periods'}
        onAdd={() => setModalOpen(true)}
        addLabel={language === 'ar' ? 'إنشاء سنة مالية' : 'Create Fiscal Year'}
      />

      <DataTable
        data={sortedPeriods}
        columns={columns}
        isLoading={isLoading}
        searchable
      />

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={language === 'ar' ? 'إنشاء سنة مالية جديدة' : 'Create New Fiscal Year'}
        onSave={() => createYearMutation.mutate(formData.fiscal_year)}
        isSaving={createYearMutation.isPending}
        saveLabel={language === 'ar' ? 'إنشاء 12 فترة' : 'Create 12 Periods'}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'السنة المالية' : 'Fiscal Year'}</Label>
            <Input 
              type="number" 
              value={formData.fiscal_year} 
              onChange={(e) => setFormData({ fiscal_year: parseInt(e.target.value) })} 
              min="2020" 
              max="2050"
            />
          </div>
          {existingYears.includes(formData.fiscal_year) && (
            <p className="text-sm text-amber-600">
              {language === 'ar' ? 'هذه السنة موجودة بالفعل' : 'This year already exists'}
            </p>
          )}
        </div>
      </FormModal>
    </div>
  );
}