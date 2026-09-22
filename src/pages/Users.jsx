import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import { formatDate } from '@/components/shared/formatters';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function Users() {
  const { t, language, isRTL } = useLanguage();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const columns = [
    {
      header: t('name'),
      accessor: 'full_name',
      sortable: true,
    },
    {
      header: t('email'),
      accessor: 'email',
      sortable: true,
    },
    {
      header: language === 'ar' ? 'الدور' : 'Role',
      accessor: 'role',
      render: (value) => (
        <Badge variant="outline" className={cn(
          "border capitalize",
          value === 'admin' 
            ? "bg-purple-100 text-purple-700 border-purple-200" 
            : "bg-slate-100 text-slate-700 border-slate-200"
        )}>
          {value}
        </Badge>
      ),
    },
    {
      header: language === 'ar' ? 'تاريخ الإنشاء' : 'Created',
      accessor: 'created_date',
      render: (value) => formatDate(value),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('users')}
        subtitle={language === 'ar' ? 'المستخدمين المسجلين في النظام' : 'Registered system users'}
      />

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        {language === 'ar' 
          ? 'ملاحظة: يمكن دعوة المستخدمين الجدد من خلال لوحة التحكم في Base44'
          : 'Note: New users can be invited through the Base44 dashboard'
        }
      </div>

      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        searchable
      />
    </div>
  );
}