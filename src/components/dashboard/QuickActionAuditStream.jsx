import React from 'react';
import { formatDateTime } from '@/components/shared/formatters';
import { Hash, ArrowLeftRight, History, FileClock } from 'lucide-react';

export default function QuickActionAuditStream({ numberingSeries, auditLogs, language, isRTL }) {
  const series = (numberingSeries || []).slice(0, 6);
  const logs = (auditLogs || [])
    .slice()
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 14);

  return (
    <div className="space-y-3">
      {/* Document Numbering status */}
      <div className="bg-erp-surface border border-erp-border rounded-md">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-erp-border">
          <Hash className="h-3.5 w-3.5 text-erp-accent" />
          <p className="text-[12px] font-medium text-slate-700">{language === 'ar' ? 'حالة الترقيم' : 'Document Numbering'}</p>
        </div>
        <div className="p-2 space-y-0.5">
          {series.length ? series.map(s => (
            <div key={s.id} className="flex items-center justify-between text-[12px] py-1 px-1">
              <span className="text-slate-600 truncate">{s.series_name || s.document_type || s.prefix || '-'}</span>
              <span className="font-mono text-slate-500 text-[11px]">
                {s.last_number_used !== undefined && s.last_number_used !== null
                  ? `#${s.last_number_used}`
                  : (s.next_number ? `→ ${s.next_number}` : '-')}
              </span>
            </div>
          )) : (
            <p className="text-[11px] text-slate-400 py-2 text-center">{language === 'ar' ? 'لا توجد سلاسل' : 'No series'}</p>
          )}
        </div>
      </div>

      {/* FX quick-check */}
      <div className="bg-erp-surface border border-erp-border rounded-md">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-erp-border">
          <ArrowLeftRight className="h-3.5 w-3.5 text-erp-accent" />
          <p className="text-[12px] font-medium text-slate-700">{language === 'ar' ? 'أسعار الصرف' : 'FX Rate Quick-Check'}</p>
        </div>
        <div className="p-3 grid grid-cols-3 gap-2 text-center">
          {['USD', 'EUR', 'SAR'].map(c => (
            <div key={c} className="border border-erp-border rounded p-1.5">
              <p className="text-[11px] font-mono text-slate-500">{c}</p>
              <p className="text-[12px] font-mono font-medium text-slate-400">—</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 px-3 pb-2">{language === 'ar' ? 'جدول الأسعار قيد الإنشاء (المرحلة 11)' : 'FX table pending build (Phase 11)'}</p>
      </div>

      {/* Audit log ticker */}
      <div className="bg-erp-surface border border-erp-border rounded-md">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-erp-border">
          <History className="h-3.5 w-3.5 text-erp-accent" />
          <p className="text-[12px] font-medium text-slate-700">{language === 'ar' ? 'سجل المراجعة' : 'Audit Stream'}</p>
        </div>
        <div className="p-2 max-h-64 overflow-y-auto space-y-0.5">
          {logs.length ? logs.map(l => (
            <div key={l.id} className="flex items-start gap-2 text-[11px] py-1 px-1 border-b border-erp-border/50 last:border-0">
              <FileClock className="h-3 w-3 text-slate-400 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-slate-600">
                  <span className="font-mono">{l.action || l.operation || '-'}</span> · {l.entity_name || l.entity || '-'}
                </p>
                <p className="text-slate-400 text-[10px]">{l.user_name || l.performed_by || '-'} · {formatDateTime(l.created_date)}</p>
              </div>
            </div>
          )) : (
            <p className="text-[11px] text-slate-400 py-2 text-center">{language === 'ar' ? 'لا توجد سجلات' : 'No logs'}</p>
          )}
        </div>
      </div>
    </div>
  );
}