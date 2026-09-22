import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import ImportExportActions from '@/components/shared/ImportExportActions';
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from '@/components/shared/formatters';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MODULE_NAME = 'MODULE 02';
const ENTITY_NAME = 'AuditLog';

export default function AuditLogs() {
  const { language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const [selectedLog, setSelectedLog] = useState(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', currentCompany?.id],
    queryFn: () => currentCompany?.id 
      ? base44.entities.AuditLog.filter({ company_id: currentCompany.id }, '-created_date', 100)
      : base44.entities.AuditLog.list('-created_date', 100)
  });

  const getActionColor = (action) => {
    switch (action) {
      case 'create': return 'bg-green-100 text-green-700';
      case 'update': return 'bg-blue-100 text-blue-700';
      case 'delete': return 'bg-red-100 text-red-700';
      case 'login': return 'bg-purple-100 text-purple-700';
      case 'logout': return 'bg-slate-100 text-slate-700';
      case 'export': return 'bg-amber-100 text-amber-700';
      case 'import': return 'bg-cyan-100 text-cyan-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const columns = [
    { 
      accessorKey: 'created_date', 
      header: language === 'ar' ? 'التاريخ والوقت' : 'Date/Time', 
      headerAr: 'التاريخ والوقت',
      cell: ({ row }) => formatDateTime(row.original.created_date),
      exportable: true
    },
    { 
      accessorKey: 'action_type', 
      header: language === 'ar' ? 'العملية' : 'Action', 
      headerAr: 'العملية',
      cell: ({ row }) => (
        <Badge className={getActionColor(row.original.action_type)}>
          {row.original.action_type}
        </Badge>
      )
    },
    { accessorKey: 'table_name', header: language === 'ar' ? 'الجدول' : 'Table', headerAr: 'الجدول' },
    { accessorKey: 'record_id', header: language === 'ar' ? 'معرف السجل' : 'Record ID', headerAr: 'معرف السجل' },
    { accessorKey: 'user_id', header: language === 'ar' ? 'المستخدم' : 'User', headerAr: 'المستخدم' },
    { accessorKey: 'ip_address', header: language === 'ar' ? 'عنوان IP' : 'IP Address', headerAr: 'عنوان IP' }
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

  return (
    <div className="space-y-4">
      <PageHeader
        title={language === 'ar' ? 'سجل المراجعة' : 'Audit Logs'}
        subtitle={language === 'ar' ? 'تتبع جميع العمليات في النظام' : 'Track all system operations'}
      >
        <ImportExportActions
          entityName={ENTITY_NAME}
          moduleName={MODULE_NAME}
          data={logs}
          columns={columns}
        />
      </PageHeader>

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
              {language === 'ar' ? 'تفاصيل سجل المراجعة' : 'Audit Log Details'}
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
                  <span className="font-medium">{language === 'ar' ? 'العملية:' : 'Action:'}</span>
                  <p><Badge className={getActionColor(selectedLog.action_type)}>{selectedLog.action_type}</Badge></p>
                </div>
                <div>
                  <span className="font-medium">{language === 'ar' ? 'الجدول:' : 'Table:'}</span>
                  <p>{selectedLog.table_name || '-'}</p>
                </div>
                <div>
                  <span className="font-medium">{language === 'ar' ? 'معرف السجل:' : 'Record ID:'}</span>
                  <p>{selectedLog.record_id || '-'}</p>
                </div>
                <div>
                  <span className="font-medium">{language === 'ar' ? 'عنوان IP:' : 'IP Address:'}</span>
                  <p>{selectedLog.ip_address || '-'}</p>
                </div>
              </div>

              {selectedLog.old_values && (
                <div>
                  <span className="font-medium text-sm">{language === 'ar' ? 'القيم القديمة:' : 'Old Values:'}</span>
                  <pre className="mt-1 p-3 bg-red-50 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(parseJSON(selectedLog.old_values), null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_values && (
                <div>
                  <span className="font-medium text-sm">{language === 'ar' ? 'القيم الجديدة:' : 'New Values:'}</span>
                  <pre className="mt-1 p-3 bg-green-50 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(parseJSON(selectedLog.new_values), null, 2)}
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