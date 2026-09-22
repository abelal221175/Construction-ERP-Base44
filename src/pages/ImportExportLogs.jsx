import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from '@/components/shared/formatters';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from 'lucide-react';

export default function ImportExportLogs() {
  const { language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const [selectedLog, setSelectedLog] = useState(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['import-export-logs', currentCompany?.id],
    queryFn: () => currentCompany?.id 
      ? base44.entities.ImportExportLog.filter({ company_id: currentCompany.id }, '-created_date', 100)
      : base44.entities.ImportExportLog.list('-created_date', 100)
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => base44.entities.User.list().catch(() => []),
    staleTime: 120_000,
  });
  const userName = (id) => {
    if (!id) return '—';
    const u = users.find((x) => x.id === id);
    return u?.full_name || id;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'completed_with_errors': return 'bg-amber-100 text-amber-700';
      case 'failed': return 'bg-red-100 text-red-700';
      case 'processing': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const columns = [
    { 
      accessorKey: 'created_date', 
      header: language === 'ar' ? 'التاريخ والوقت' : 'Date/Time', 
      headerAr: 'التاريخ والوقت',
      cell: ({ row }) => formatDateTime(row.original.created_date)
    },
    { 
      accessorKey: 'created_by_id', 
      header: language === 'ar' ? 'بواسطة' : 'Performed By', 
      headerAr: 'بواسطة',
      cell: ({ row }) => userName(row.original.created_by_id)
    },
    { 
      accessorKey: 'operation_type', 
      header: language === 'ar' ? 'العملية' : 'Operation', 
      headerAr: 'العملية',
      cell: ({ row }) => (
        <Badge className={row.original.operation_type === 'import' ? 'bg-cyan-100 text-cyan-700' : 'bg-purple-100 text-purple-700'}>
          {row.original.operation_type === 'import' 
            ? (language === 'ar' ? 'استيراد' : 'Import')
            : (language === 'ar' ? 'تصدير' : 'Export')}
        </Badge>
      )
    },
    { accessorKey: 'module_name', header: language === 'ar' ? 'الوحدة' : 'Module', headerAr: 'الوحدة' },
    { accessorKey: 'table_name', header: language === 'ar' ? 'الجدول' : 'Table', headerAr: 'الجدول' },
    { accessorKey: 'file_name', header: language === 'ar' ? 'اسم الملف' : 'File Name', headerAr: 'اسم الملف' },
    { accessorKey: 'total_records', header: language === 'ar' ? 'الإجمالي' : 'Total', headerAr: 'الإجمالي', type: 'number' },
    { accessorKey: 'success_count', header: language === 'ar' ? 'نجاح' : 'Success', headerAr: 'نجاح', type: 'number' },
    { accessorKey: 'error_count', header: language === 'ar' ? 'أخطاء' : 'Errors', headerAr: 'أخطاء', type: 'number' },
    { 
      accessorKey: 'status', 
      header: language === 'ar' ? 'الحالة' : 'Status', 
      headerAr: 'الحالة',
      cell: ({ row }) => (
        <Badge className={getStatusColor(row.original.status)}>
          {row.original.status}
        </Badge>
      )
    }
  ];

  const handleRowClick = (log) => {
    setSelectedLog(log);
  };

  const parseJSON = (str) => {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  };

  const downloadErrorReport = () => {
    if (!selectedLog?.error_details) return;
    
    const errors = parseJSON(selectedLog.error_details);
    if (!Array.isArray(errors)) return;

    const headers = ['Row', 'Errors'];
    const rows = errors.map(err => [
      err.row,
      err.errors?.join('; ') || ''
    ]);

    const BOM = '\uFEFF';
    const csvContent = BOM + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ErrorReport_${selectedLog.table_name}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={language === 'ar' ? 'سجلات الاستيراد والتصدير' : 'Import/Export Logs'}
        subtitle={language === 'ar' ? 'تتبع عمليات الاستيراد والتصدير' : 'Track import and export operations'}
      />

      <DataTable
        data={logs}
        columns={columns}
        isLoading={isLoading}
        onRowClick={handleRowClick}
      />

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>
              {language === 'ar' ? 'تفاصيل العملية' : 'Operation Details'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">{language === 'ar' ? 'التاريخ والوقت:' : 'Date/Time:'}</span>
                  <p>{formatDateTime(selectedLog.created_date)}</p>
                </div>
                <div>
                  <span className="font-medium">{language === 'ar' ? 'بواسطة:' : 'Performed By:'}</span>
                  <p>{userName(selectedLog.created_by_id)}</p>
                </div>
                <div>
                  <span className="font-medium">{language === 'ar' ? 'العملية:' : 'Operation:'}</span>
                  <p>
                    <Badge className={selectedLog.operation_type === 'import' ? 'bg-cyan-100 text-cyan-700' : 'bg-purple-100 text-purple-700'}>
                      {selectedLog.operation_type}
                    </Badge>
                  </p>
                </div>
                <div>
                  <span className="font-medium">{language === 'ar' ? 'الوحدة:' : 'Module:'}</span>
                  <p>{selectedLog.module_name}</p>
                </div>
                <div>
                  <span className="font-medium">{language === 'ar' ? 'الجدول:' : 'Table:'}</span>
                  <p>{selectedLog.table_name}</p>
                </div>
                <div>
                  <span className="font-medium">{language === 'ar' ? 'اسم الملف:' : 'File Name:'}</span>
                  <p>{selectedLog.file_name || '-'}</p>
                </div>
                <div>
                  <span className="font-medium">{language === 'ar' ? 'الحالة:' : 'Status:'}</span>
                  <p><Badge className={getStatusColor(selectedLog.status)}>{selectedLog.status}</Badge></p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-700">{selectedLog.total_records || 0}</p>
                  <p className="text-sm text-slate-500">{language === 'ar' ? 'الإجمالي' : 'Total'}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{selectedLog.success_count || 0}</p>
                  <p className="text-sm text-slate-500">{language === 'ar' ? 'نجاح' : 'Success'}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{selectedLog.error_count || 0}</p>
                  <p className="text-sm text-slate-500">{language === 'ar' ? 'أخطاء' : 'Errors'}</p>
                </div>
              </div>

              {selectedLog.error_details && selectedLog.error_count > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{language === 'ar' ? 'تفاصيل الأخطاء:' : 'Error Details:'}</span>
                    <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                      <Download className="h-4 w-4 mr-1" />
                      {language === 'ar' ? 'تحميل التقرير' : 'Download Report'}
                    </Button>
                  </div>
                  <pre className="p-3 bg-red-50 rounded-lg text-xs overflow-x-auto max-h-48">
                    {JSON.stringify(parseJSON(selectedLog.error_details), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}