import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowUpRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@/components/shared/formatters';
import { cn } from '@/lib/utils';

const STATUS_STYLES = {
  active: 'bg-emerald-50 text-emerald-700',
  open: 'bg-blue-50 text-blue-700',
  sent: 'bg-blue-50 text-blue-700',
  draft: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  received: 'bg-emerald-50 text-emerald-700',
  posted: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
  closed: 'bg-slate-100 text-slate-500',
};

const StatusChip = ({ status }) => (
  <span className={cn('px-1.5 py-0.5 text-[9px] font-medium rounded uppercase tracking-wide', STATUS_STYLES[status] || 'bg-slate-100 text-slate-600')}>
    {status || '—'}
  </span>
);

function RecentList({ title, icon: Icon, records, codeField, dateField, amountField, link, language }) {
  const rows = [...records]
    .sort((a, b) => new Date(b[dateField] || b.created_date || 0) - new Date(a[dateField] || a.created_date || 0))
    .slice(0, 5);

  return (
    <div className="bg-quartz-card border border-quartz-border rounded-lg p-3 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-quartz-accent" />
          <span className="text-[12px] font-semibold text-slate-700">{title}</span>
        </div>
        <Link to={createPageUrl(link)} className="text-quartz-muted hover:text-quartz-accent">
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="text-[11px] text-quartz-muted py-4 text-center">
          {language === 'ar' ? 'لا توجد سجلات' : 'No records'}
        </p>
      ) : (
        <div className="space-y-1">
          {rows.map((r) => (
            <Link
              key={r.id}
              to={createPageUrl(link)}
              className="flex items-center justify-between gap-2 py-1.5 px-2 -mx-2 rounded hover:bg-slate-50 transition-colors group"
            >
              <div className="flex flex-col min-w-0">
                <span className="font-mono text-[12px] font-medium text-slate-800 truncate">
                  {r[codeField] || '—'}
                </span>
                <span className="text-[10px] text-quartz-muted">{formatDate(r[dateField])}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {amountField && (
                  <span className="font-mono text-[11px] text-slate-700">
                    {formatCurrency(r[amountField] || 0, 'EGP', 0)}
                  </span>
                )}
                <StatusChip status={r.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RecentTransactions({ recentWidgets, data, language }) {
  if (!recentWidgets.length) return null;
  const map = {
    pos: { codeField: 'po_number', dateField: 'order_date', amountField: 'total_amount', link: 'PurchaseOrders' },
    ipcs: { codeField: 'ipc_number', dateField: 'ipc_date', amountField: 'total_amount', link: 'ClientIPC' },
    approvals: { codeField: 'document_type', dateField: 'request_date', amountField: null, link: 'PendingApprovals' },
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
      {recentWidgets.map((w) => {
        const cfg = map[w.recentKey];
        if (!cfg) return null;
        return (
          <RecentList
            key={w.id}
            title={language === 'ar' ? w.titleAr : w.titleEn}
            icon={w.icon}
            records={data[w.recentKey] || []}
            {...cfg}
            language={language}
          />
        );
      })}
    </div>
  );
}