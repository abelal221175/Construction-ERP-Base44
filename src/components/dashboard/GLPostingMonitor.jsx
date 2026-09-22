import React from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/components/shared/formatters';

export default function GLPostingMonitor({ journalEntries, language, isRTL }) {
  const entries = journalEntries || [];
  const isPosted = (e) => e.status === 'posted' || e.is_posted === true;
  const posted = entries.filter(isPosted);
  const draft = entries.filter(e => !isPosted(e));
  const totalDebit = entries.reduce((s, e) => s + (e.total_debit || e.debit || 0), 0);
  const totalCredit = entries.reduce((s, e) => s + (e.total_credit || e.credit || 0), 0);
  const recent = [...entries]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 12);

  const stats = [
    { label: language === 'ar' ? 'إجمالي القيود' : 'Total Entries', value: entries.length, tone: 'text-slate-700' },
    { label: language === 'ar' ? 'مرحّلة' : 'Posted', value: posted.length, tone: 'text-erp-emerald' },
    { label: language === 'ar' ? 'مسودة' : 'Draft', value: draft.length, tone: 'text-erp-amber' },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s, i) => (
          <div key={i} className="border border-erp-border rounded-md p-2.5">
            <p className="text-[11px] text-slate-500 uppercase tracking-wide">{s.label}</p>
            <p className={cn("text-lg font-mono font-semibold", s.tone)}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-between border border-erp-border rounded-md p-2.5">
        <div>
          <p className="text-[11px] text-slate-500">{language === 'ar' ? 'إجمالي المدين' : 'Total Debit'}</p>
          <p className="font-mono text-sm font-medium text-slate-700">{formatCurrency(totalDebit, 'EGP', 0)}</p>
        </div>
        <div className="text-end">
          <p className="text-[11px] text-slate-500">{language === 'ar' ? 'إجمالي الدائن' : 'Total Credit'}</p>
          <p className="font-mono text-sm font-medium text-slate-700">{formatCurrency(totalCredit, 'EGP', 0)}</p>
        </div>
      </div>

      <div className="border border-erp-border rounded-md overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase">
            <tr>
              <th className="text-start px-2.5 py-1.5 font-medium border-b border-erp-border font-mono">#</th>
              <th className="text-start px-2.5 py-1.5 font-medium border-b border-erp-border">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
              <th className="text-end px-2.5 py-1.5 font-medium border-b border-erp-border font-mono">{language === 'ar' ? 'المدين' : 'Debit'}</th>
              <th className="text-end px-2.5 py-1.5 font-medium border-b border-erp-border font-mono">{language === 'ar' ? 'الدائن' : 'Credit'}</th>
              <th className="text-center px-2.5 py-1.5 font-medium border-b border-erp-border">{language === 'ar' ? 'الحالة' : 'Status'}</th>
            </tr>
          </thead>
          <tbody>
            {recent.map(e => {
              const posted = isPosted(e);
              return (
                <tr key={e.id} className="border-b border-erp-border last:border-0 hover:bg-slate-50">
                  <td className="px-2.5 py-1.5 font-mono text-slate-600">{e.entry_number || e.journal_number || '-'}</td>
                  <td className="px-2.5 py-1.5 text-slate-600">{formatDate(e.entry_date || e.created_date)}</td>
                  <td className="px-2.5 py-1.5 text-end font-mono text-slate-700">{formatCurrency(e.total_debit || e.debit || 0, 'EGP', 0)}</td>
                  <td className="px-2.5 py-1.5 text-end font-mono text-slate-700">{formatCurrency(e.total_credit || e.credit || 0, 'EGP', 0)}</td>
                  <td className="px-2.5 py-1.5 text-center">
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-medium",
                      posted ? "bg-emerald-100 text-erp-emerald" : "bg-amber-100 text-erp-amber"
                    )}>
                      {posted ? (language === 'ar' ? 'مرحّل' : 'Posted') : (language === 'ar' ? 'مسودة' : 'Draft')}
                    </span>
                  </td>
                </tr>
              );
            })}
            {!recent.length && (
              <tr>
                <td colSpan={5} className="text-center text-slate-400 py-6">{language === 'ar' ? 'لا توجد قيود' : 'No entries'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}